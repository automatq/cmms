import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource } from 'typeorm';
import { Part } from './entities/part.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PoLineItem } from './entities/po-line-item.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
@Processor('reorder-checker')
export class ReorderCheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ReorderCheckProcessor.name);

  constructor(
    @InjectQueue('reorder-checker')
    private readonly reorderQueue: Queue,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(InventoryStock)
    private readonly stockRepo: Repository<InventoryStock>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PoLineItem)
    private readonly poLineRepo: Repository<PoLineItem>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    const existingJobs = await this.reorderQueue.getRepeatableJobs();

    if (!existingJobs.some((job) => job.name === 'check-reorder-levels')) {
      await this.reorderQueue.add('check-reorder-levels', {}, {
        repeat: { pattern: '0 7 * * *' }, // Daily at 7 AM
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log('Reorder check job registered (daily at 7 AM)');
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name}`);

    if (job.name === 'check-reorder-levels') {
      await this.checkReorderLevels();
    }
  }

  private async checkReorderLevels(): Promise<void> {
    // Find all parts with reorder points set
    const parts = await this.partRepo.find({
      where: { reorderPoint: Not(IsNull()), isActive: true },
      relations: ['supplier'],
    });

    // Group by tenant for PO creation
    const tenantParts = new Map<string, Array<{ part: Part; totalOnHand: number; defaultStoreroomId?: string }>>();

    for (const part of parts) {
      if (!part.reorderPoint) continue;

      const stocks = await this.stockRepo.find({ where: { partId: part.id, tenantId: part.tenantId } });
      const totalOnHand = stocks.reduce((sum, s) => sum + Number(s.qtyOnHand), 0);

      if (totalOnHand <= Number(part.reorderPoint)) {
        // Check if there's already a draft/sent PO containing this part
        const existingPO = await this.poLineRepo
          .createQueryBuilder('line')
          .innerJoin('line.purchaseOrder', 'po')
          .where('line.partId = :partId', { partId: part.id })
          .andWhere('line.tenantId = :tenantId', { tenantId: part.tenantId })
          .andWhere('po.status IN (:...statuses)', { statuses: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT] })
          .getOne();

        if (existingPO) continue; // Already on order

        const entry = { part, totalOnHand, defaultStoreroomId: stocks[0]?.storeroomId };
        if (!tenantParts.has(part.tenantId)) {
          tenantParts.set(part.tenantId, []);
        }
        tenantParts.get(part.tenantId)!.push(entry);
      }
    }

    // Create draft POs grouped by tenant + supplier
    let totalPOs = 0;
    for (const [tenantId, items] of tenantParts) {
      // Group by supplier
      const bySupplier = new Map<string, typeof items>();
      for (const item of items) {
        const supplierId = item.part.supplierId || '__no_supplier__';
        if (!bySupplier.has(supplierId)) {
          bySupplier.set(supplierId, []);
        }
        bySupplier.get(supplierId)!.push(item);
      }

      for (const [supplierId, supplierItems] of bySupplier) {
        try {
          await this.createDraftPO(tenantId, supplierId === '__no_supplier__' ? null : supplierId, supplierItems);
          totalPOs++;
        } catch (error) {
          this.logger.error(`Failed to create draft PO for tenant ${tenantId}: ${(error as Error).message}`);
        }
      }

      // Notify tenant
      try {
        await this.notificationsService.broadcastToTenant(
          'reorder_alert',
          'Low Stock: Draft POs Created',
          `${items.length} part(s) below reorder point. Draft purchase orders have been created for review.`,
          { partCount: items.length },
          tenantId,
        );
      } catch (error) {
        this.logger.error(`Failed to send reorder notification: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Reorder check complete: ${totalPOs} draft PO(s) created`);
  }

  private async createDraftPO(
    tenantId: string,
    supplierId: string | null,
    items: Array<{ part: Part; totalOnHand: number; defaultStoreroomId?: string }>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const lineRepo = manager.getRepository(PoLineItem);

      // Generate PO number
      const year = new Date().getFullYear();
      const lastPO = await poRepo
        .createQueryBuilder('po')
        .where('po.poNumber LIKE :pattern', { pattern: `PO-${year}-%` })
        .andWhere('po.tenantId = :tenantId', { tenantId })
        .orderBy('po.poNumber', 'DESC')
        .getOne();

      let seq = 1;
      if (lastPO?.poNumber) {
        const parts = lastPO.poNumber.split('-');
        seq = parseInt(parts[2], 10) + 1;
      }
      const poNumber = `PO-${year}-${seq.toString().padStart(5, '0')}`;

      const lineItems = items.map((item) => ({
        partId: item.part.id,
        qty: Number(item.part.reorderQty) || (Number(item.part.maxStock) - item.totalOnHand) || 1,
        unitCost: Number(item.part.unitCost) || 0,
        storeroomId: item.defaultStoreroomId,
      }));

      const totalCost = lineItems.reduce((sum, li) => sum + li.qty * li.unitCost, 0);

      const po = poRepo.create({
        poNumber,
        supplierId: supplierId || undefined,
        notes: 'Auto-generated by reorder check',
        totalCost,
        createdBy: 'system',
        tenantId,
        status: PurchaseOrderStatus.DRAFT,
      });
      const savedPO = await poRepo.save(po);

      for (const li of lineItems) {
        const line = lineRepo.create({
          poId: savedPO.id,
          partId: li.partId,
          storeroomId: li.storeroomId,
          qtyOrdered: li.qty,
          unitCost: li.unitCost,
          tenantId,
        });
        await lineRepo.save(line);
      }
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}
