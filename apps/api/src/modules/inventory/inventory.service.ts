import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like, LessThanOrEqual } from 'typeorm';
import { Part } from './entities/part.entity';
import { Supplier } from './entities/supplier.entity';
import { Storeroom } from './entities/storeroom.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryTransaction, TransactionType } from './entities/inventory-transaction.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PoLineItem } from './entities/po-line-item.entity';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePartDto,
  UpdatePartDto,
  PartQueryDto,
  CreateStoreroomDto,
  UpdateStoreroomDto,
  AdjustStockDto,
  IssueStockDto,
  ReceiveStockDto,
  TransferStockDto,
  ReserveStockDto,
  ReleaseReservationDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  POQueryDto,
  ReceivePODto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Part)
    private partRepo: Repository<Part>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(Storeroom)
    private storeroomRepo: Repository<Storeroom>,
    @InjectRepository(InventoryStock)
    private stockRepo: Repository<InventoryStock>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(PurchaseOrder)
    private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PoLineItem)
    private poLineRepo: Repository<PoLineItem>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== SUPPLIERS ====================

  async createSupplier(dto: CreateSupplierDto, tenantId: string): Promise<Supplier> {
    const supplier = this.supplierRepo.create({ ...dto, tenantId });
    return this.supplierRepo.save(supplier);
  }

  async findAllSuppliers(tenantId: string, activeOnly = false): Promise<Supplier[]> {
    const where = activeOnly ? { tenantId, isActive: true } : { tenantId };
    return this.supplierRepo.find({ where, order: { name: 'ASC' } });
  }

  async findSupplierById(id: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto, tenantId: string): Promise<Supplier> {
    const supplier = await this.findSupplierById(id, tenantId);
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async deleteSupplier(id: string, tenantId: string): Promise<void> {
    const supplier = await this.findSupplierById(id, tenantId);
    await this.supplierRepo.softRemove(supplier);
  }

  // ==================== PARTS ====================

  async createPart(dto: CreatePartDto, tenantId: string): Promise<Part> {
    const existingSku = await this.partRepo.findOne({ where: { sku: dto.sku, tenantId } });
    if (existingSku) throw new ConflictException(`SKU ${dto.sku} already exists`);

    const part = this.partRepo.create({ ...dto, tenantId });
    return this.partRepo.save(part);
  }

  async findAllParts(query: PartQueryDto, tenantId: string): Promise<{ data: Part[]; total: number; page: number; limit: number }> {
    const qb = this.partRepo.createQueryBuilder('part')
      .leftJoinAndSelect('part.supplier', 'supplier')
      .andWhere('part.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere('(part.name ILIKE :search OR part.sku ILIKE :search OR part.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.category) {
      qb.andWhere('part.category = :category', { category: query.category });
    }

    if (query.supplierId) {
      qb.andWhere('part.supplierId = :supplierId', { supplierId: query.supplierId });
    }

    if (query.isCritical !== undefined) {
      qb.andWhere('part.isCritical = :isCritical', { isCritical: query.isCritical });
    }

    if (query.lowStock) {
      // Low stock is when total qty across all storerooms is at or below reorder point
      qb.leftJoin(
        (subQuery) => subQuery
          .select('stock.partId', 'partId')
          .addSelect('COALESCE(SUM(stock.qtyOnHand), 0)', 'totalQty')
          .from(InventoryStock, 'stock')
          .groupBy('stock.partId'),
        'stockSummary',
        'stockSummary.partId = part.id'
      )
      .andWhere('COALESCE(stockSummary.totalQty, 0) <= part.reorderPoint');
    }

    const total = await qb.getCount();

    qb.orderBy(`part.${query.sortBy || 'name'}`, query.sortOrder || 'ASC')
      .skip(((query.page || 1) - 1) * (query.limit || 20))
      .take(query.limit || 20);

    const data = await qb.getMany();

    return { data, total, page: query.page || 1, limit: query.limit || 20 };
  }

  async findPartById(id: string, tenantId: string): Promise<Part> {
    const part = await this.partRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier'],
    });
    if (!part) throw new NotFoundException(`Part ${id} not found`);
    return part;
  }

  async findPartBySku(sku: string, tenantId: string): Promise<Part> {
    const part = await this.partRepo.findOne({ where: { sku, tenantId } });
    if (!part) throw new NotFoundException(`Part with SKU ${sku} not found`);
    return part;
  }

  async updatePart(id: string, dto: UpdatePartDto, tenantId: string): Promise<Part> {
    const part = await this.findPartById(id, tenantId);
    Object.assign(part, dto);
    return this.partRepo.save(part);
  }

  async deletePart(id: string, tenantId: string): Promise<void> {
    const part = await this.findPartById(id, tenantId);
    await this.partRepo.softRemove(part);
  }

  async getPartCategories(tenantId: string): Promise<string[]> {
    const result = await this.partRepo
      .createQueryBuilder('part')
      .select('DISTINCT part.category', 'category')
      .where('part.category IS NOT NULL')
      .andWhere('part.tenantId = :tenantId', { tenantId })
      .orderBy('part.category', 'ASC')
      .getRawMany();
    return result.map((r) => r.category);
  }

  // ==================== STOREROOMS ====================

  async createStoreroom(dto: CreateStoreroomDto, tenantId: string): Promise<Storeroom> {
    const storeroom = this.storeroomRepo.create({ ...dto, tenantId });
    return this.storeroomRepo.save(storeroom);
  }

  async findAllStorerooms(tenantId: string, activeOnly = false): Promise<Storeroom[]> {
    const where = activeOnly ? { tenantId, isActive: true } : { tenantId };
    return this.storeroomRepo.find({
      where,
      relations: ['location'],
      order: { name: 'ASC' },
    });
  }

  async findStoreroomById(id: string, tenantId: string): Promise<Storeroom> {
    const storeroom = await this.storeroomRepo.findOne({
      where: { id, tenantId },
      relations: ['location'],
    });
    if (!storeroom) throw new NotFoundException(`Storeroom ${id} not found`);
    return storeroom;
  }

  async updateStoreroom(id: string, dto: UpdateStoreroomDto, tenantId: string): Promise<Storeroom> {
    const storeroom = await this.findStoreroomById(id, tenantId);
    Object.assign(storeroom, dto);
    return this.storeroomRepo.save(storeroom);
  }

  async deleteStoreroom(id: string, tenantId: string): Promise<void> {
    const storeroom = await this.findStoreroomById(id, tenantId);
    await this.storeroomRepo.softRemove(storeroom);
  }

  // ==================== STOCK MANAGEMENT ====================

  async getStockForPart(partId: string, tenantId: string): Promise<InventoryStock[]> {
    return this.stockRepo.find({
      where: { partId, tenantId },
      relations: ['storeroom', 'part'],
    });
  }

  async getStockForStoreroom(storeroomId: string, tenantId: string): Promise<InventoryStock[]> {
    return this.stockRepo.find({
      where: { storeroomId, tenantId },
      relations: ['part', 'part.supplier'],
    });
  }

  async getStockLevel(partId: string, storeroomId: string, tenantId: string): Promise<InventoryStock | null> {
    return this.stockRepo.findOne({
      where: { partId, storeroomId, tenantId },
    });
  }

  async getTotalStockForPart(partId: string, tenantId: string): Promise<{ qtyOnHand: number; qtyReserved: number; qtyAvailable: number }> {
    const stocks = await this.stockRepo.find({ where: { partId, tenantId } });
    const qtyOnHand = stocks.reduce((sum, s) => sum + s.qtyOnHand, 0);
    const qtyReserved = stocks.reduce((sum, s) => sum + s.qtyReserved, 0);
    return { qtyOnHand, qtyReserved, qtyAvailable: qtyOnHand - qtyReserved };
  }

  private async getOrCreateStock(partId: string, storeroomId: string, tenantId: string): Promise<InventoryStock> {
    let stock = await this.stockRepo.findOne({ where: { partId, storeroomId, tenantId } });
    if (!stock) {
      stock = this.stockRepo.create({ partId, storeroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
      stock = await this.stockRepo.save(stock);
    }
    return stock;
  }

  async receiveStock(dto: ReceiveStockDto, performedBy: string, tenantId: string): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      const part = await manager.getRepository(Part).findOne({ where: { id: dto.partId } });
      if (!part) throw new NotFoundException(`Part ${dto.partId} not found`);

      let stock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.storeroomId } });
      if (!stock) {
        stock = stockRepo.create({ partId: dto.partId, storeroomId: dto.storeroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
      }

      stock.qtyOnHand += dto.qty;
      if (stock.qtyOnOrder >= dto.qty) {
        stock.qtyOnOrder -= dto.qty;
      } else {
        stock.qtyOnOrder = 0;
      }
      await stockRepo.save(stock);

      const tx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.storeroomId,
        tenantId,
        type: TransactionType.RECEIVE,
        qty: dto.qty,
        unitCost: dto.unitCost || part.unitCost,
        notes: dto.notes,
        referenceId: dto.purchaseOrderId,
        referenceType: dto.purchaseOrderId ? 'PurchaseOrder' : undefined,
        performedBy,
      });
      return txRepo.save(tx);
    });
  }

  async issueStock(dto: IssueStockDto, performedBy: string, tenantId: string): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      const stock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.storeroomId } });
      if (!stock) throw new NotFoundException('Stock record not found');

      const available = stock.qtyOnHand - stock.qtyReserved;
      if (available < dto.qty) {
        throw new BadRequestException(`Insufficient stock. Available: ${available}, Requested: ${dto.qty}`);
      }

      stock.qtyOnHand -= dto.qty;
      await stockRepo.save(stock);

      const part = await manager.getRepository(Part).findOne({ where: { id: dto.partId } });

      const tx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.storeroomId,
        tenantId,
        type: TransactionType.ISSUE,
        qty: -dto.qty,
        unitCost: part?.unitCost,
        notes: dto.notes,
        referenceId: dto.workOrderId,
        referenceType: dto.workOrderId ? 'WorkOrder' : undefined,
        performedBy,
      });
      const savedTx = await txRepo.save(tx);

      // Check for low stock notification
      await this.checkLowStock(dto.partId, tenantId, manager);

      return savedTx;
    });
  }

  async adjustStock(dto: AdjustStockDto, performedBy: string, tenantId: string): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      let stock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.storeroomId } });
      if (!stock) {
        stock = stockRepo.create({ partId: dto.partId, storeroomId: dto.storeroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
      }

      const newQty = stock.qtyOnHand + dto.adjustmentQty;
      if (newQty < 0) {
        throw new BadRequestException('Adjustment would result in negative stock');
      }

      stock.qtyOnHand = newQty;
      await stockRepo.save(stock);

      const tx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.storeroomId,
        tenantId,
        type: TransactionType.ADJUST,
        qty: dto.adjustmentQty,
        notes: dto.reason,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        performedBy,
      });
      return txRepo.save(tx);
    });
  }

  async transferStock(dto: TransferStockDto, performedBy: string, tenantId: string): Promise<{ issueTransaction: InventoryTransaction; receiveTransaction: InventoryTransaction }> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      // Check source stock
      const fromStock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.fromStoreroomId } });
      if (!fromStock) throw new NotFoundException('Source stock record not found');

      const available = fromStock.qtyOnHand - fromStock.qtyReserved;
      if (available < dto.qty) {
        throw new BadRequestException(`Insufficient stock in source. Available: ${available}, Requested: ${dto.qty}`);
      }

      // Deduct from source
      fromStock.qtyOnHand -= dto.qty;
      await stockRepo.save(fromStock);

      // Add to destination
      let toStock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.toStoreroomId } });
      if (!toStock) {
        toStock = stockRepo.create({ partId: dto.partId, storeroomId: dto.toStoreroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
      }
      toStock.qtyOnHand += dto.qty;
      await stockRepo.save(toStock);

      // Create transactions
      const issueTx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.fromStoreroomId,
        tenantId,
        type: TransactionType.TRANSFER,
        qty: -dto.qty,
        notes: dto.notes ? `Transfer to storeroom: ${dto.notes}` : 'Transfer out',
        performedBy,
      });

      const receiveTx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.toStoreroomId,
        tenantId,
        type: TransactionType.TRANSFER,
        qty: dto.qty,
        notes: dto.notes ? `Transfer from storeroom: ${dto.notes}` : 'Transfer in',
        performedBy,
      });

      return {
        issueTransaction: await txRepo.save(issueTx),
        receiveTransaction: await txRepo.save(receiveTx),
      };
    });
  }

  async reserveStock(dto: ReserveStockDto, performedBy: string, tenantId: string): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      const stock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.storeroomId } });
      if (!stock) throw new NotFoundException('Stock record not found');

      const available = stock.qtyOnHand - stock.qtyReserved;
      if (available < dto.qty) {
        throw new BadRequestException(`Insufficient stock to reserve. Available: ${available}, Requested: ${dto.qty}`);
      }

      stock.qtyReserved += dto.qty;
      await stockRepo.save(stock);

      const tx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.storeroomId,
        tenantId,
        type: TransactionType.RESERVE,
        qty: dto.qty,
        notes: dto.notes,
        referenceId: dto.workOrderId,
        referenceType: 'WorkOrder',
        performedBy,
      });
      return txRepo.save(tx);
    });
  }

  async releaseReservation(dto: ReleaseReservationDto, performedBy: string, tenantId: string): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      const stock = await stockRepo.findOne({ where: { partId: dto.partId, storeroomId: dto.storeroomId } });
      if (!stock) throw new NotFoundException('Stock record not found');

      const releaseQty = dto.qty || stock.qtyReserved;
      if (stock.qtyReserved < releaseQty) {
        throw new BadRequestException(`Cannot release ${releaseQty}. Only ${stock.qtyReserved} reserved.`);
      }

      stock.qtyReserved -= releaseQty;
      await stockRepo.save(stock);

      const tx = txRepo.create({
        partId: dto.partId,
        storeroomId: dto.storeroomId,
        tenantId,
        type: TransactionType.RELEASE,
        qty: -releaseQty,
        referenceId: dto.workOrderId,
        referenceType: 'WorkOrder',
        performedBy,
      });
      return txRepo.save(tx);
    });
  }

  private async checkLowStock(partId: string, tenantId: string, manager?: any): Promise<void> {
    const repo = manager ? manager.getRepository(Part) : this.partRepo;
    const stockRepoToUse = manager ? manager.getRepository(InventoryStock) : this.stockRepo;

    const part = await repo.findOne({ where: { id: partId, tenantId } });
    if (!part || !part.reorderPoint) return;

    const stocks = await stockRepoToUse.find({ where: { partId, tenantId } });
    const totalOnHand = stocks.reduce((sum, s) => sum + s.qtyOnHand, 0);

    if (totalOnHand <= part.reorderPoint) {
      await this.notificationsService.onLowStock(part, totalOnHand, tenantId);
    }
  }

  async findAvailableStoreroom(partId: string, requiredQty: number, tenantId: string): Promise<string | null> {
    const stocks = await this.stockRepo.find({ where: { partId, tenantId } });
    for (const stock of stocks) {
      const available = stock.qtyOnHand - stock.qtyReserved;
      if (available >= requiredQty) {
        return stock.storeroomId;
      }
    }
    return null;
  }

  async getLowStockParts(tenantId: string): Promise<Part[]> {
    const parts = await this.partRepo.find({ where: { reorderPoint: LessThanOrEqual(0) } });
    const lowStockParts: Part[] = [];

    for (const part of await this.partRepo.find({ where: { tenantId } })) {
      if (!part.reorderPoint) continue;
      const { qtyOnHand } = await this.getTotalStockForPart(part.id, tenantId);
      if (qtyOnHand <= part.reorderPoint) {
        lowStockParts.push(part);
      }
    }

    return lowStockParts;
  }

  // ==================== TRANSACTIONS ====================

  async getTransactionHistory(
    filters: { partId?: string; storeroomId?: string; transactionType?: TransactionType; fromDate?: Date; toDate?: Date },
    page = 1,
    limit = 50,
    tenantId?: string,
  ): Promise<{ data: InventoryTransaction[]; total: number }> {
    const qb = this.transactionRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.part', 'part')
      .leftJoinAndSelect('tx.storeroom', 'storeroom');

    if (tenantId) {
      qb.andWhere('tx.tenantId = :tenantId', { tenantId });
    }

    if (filters.partId) {
      qb.andWhere('tx.partId = :partId', { partId: filters.partId });
    }
    if (filters.storeroomId) {
      qb.andWhere('tx.storeroomId = :storeroomId', { storeroomId: filters.storeroomId });
    }
    if (filters.transactionType) {
      qb.andWhere('tx.type = :transactionType', { transactionType: filters.transactionType });
    }
    if (filters.fromDate) {
      qb.andWhere('tx.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('tx.createdAt <= :toDate', { toDate: filters.toDate });
    }

    const total = await qb.getCount();

    qb.orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const data = await qb.getMany();
    return { data, total };
  }

  // ==================== PURCHASE ORDERS ====================

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, createdBy: string, tenantId: string): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const lineRepo = manager.getRepository(PoLineItem);
      const stockRepo = manager.getRepository(InventoryStock);

      // Generate PO number
      const year = new Date().getFullYear();
      const lastPO = await poRepo
        .createQueryBuilder('po')
        .where('po.poNumber LIKE :pattern', { pattern: `PO-${year}-%` })
        .orderBy('po.poNumber', 'DESC')
        .getOne();

      let seq = 1;
      if (lastPO?.poNumber) {
        const parts = lastPO.poNumber.split('-');
        seq = parseInt(parts[2], 10) + 1;
      }
      const poNumber = dto.poNumber || `PO-${year}-${seq.toString().padStart(5, '0')}`;

      // Calculate total
      const totalCost = dto.lineItems.reduce((sum, item) => sum + item.qtyOrdered * item.unitCost, 0);

      const po = poRepo.create({
        poNumber,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        shippingAddress: dto.shippingAddress,
        notes: dto.notes,
        totalCost,
        createdBy,
        tenantId,
        status: PurchaseOrderStatus.DRAFT,
      });
      const savedPO = await poRepo.save(po);

      // Create line items and update qtyOnOrder
      for (const item of dto.lineItems) {
        const lineItem = lineRepo.create({
          poId: savedPO.id,
          partId: item.partId,
          storeroomId: item.storeroomId,
          qtyOrdered: item.qtyOrdered,
          unitCost: item.unitCost,
          tenantId,
        });
        await lineRepo.save(lineItem);

        // Update qty on order
        let stock = await stockRepo.findOne({ where: { partId: item.partId, storeroomId: item.storeroomId } });
        if (!stock) {
          stock = stockRepo.create({ partId: item.partId, storeroomId: item.storeroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
        }
        stock.qtyOnOrder += item.qtyOrdered;
        await stockRepo.save(stock);
      }

      return this.findPurchaseOrderById(savedPO.id, tenantId, manager);
    });
  }

  async findAllPurchaseOrders(query: POQueryDto, tenantId: string): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const qb = this.poRepo.createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.lineItems', 'lineItems')
      .leftJoinAndSelect('lineItems.part', 'part')
      .andWhere('po.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere('(po.poNumber ILIKE :search OR supplier.name ILIKE :search)', { search: `%${query.search}%` });
    }

    if (query.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId: query.supplierId });
    }

    if (query.status) {
      qb.andWhere('po.status = :status', { status: query.status });
    }

    if (query.fromDate) {
      qb.andWhere('po.createdAt >= :fromDate', { fromDate: new Date(query.fromDate) });
    }

    if (query.toDate) {
      qb.andWhere('po.createdAt <= :toDate', { toDate: new Date(query.toDate) });
    }

    const total = await qb.getCount();

    qb.orderBy(`po.${query.sortBy || 'createdAt'}`, query.sortOrder || 'DESC')
      .skip(((query.page || 1) - 1) * (query.limit || 20))
      .take(query.limit || 20);

    const data = await qb.getMany();

    return { data, total, page: query.page || 1, limit: query.limit || 20 };
  }

  async findPurchaseOrderById(id: string, tenantId: string, manager?: any): Promise<PurchaseOrder> {
    const repo = manager ? manager.getRepository(PurchaseOrder) : this.poRepo;
    const po = await repo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'lineItems', 'lineItems.part', 'lineItems.storeroom'],
    });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrder> {
    const po = await this.findPurchaseOrderById(id, tenantId);

    if (po.status === PurchaseOrderStatus.RECEIVED || po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a received or cancelled PO');
    }

    Object.assign(po, {
      ...dto,
      expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : po.expectedDate,
    });
    await this.poRepo.save(po);
    return this.findPurchaseOrderById(id, tenantId);
  }

  async sendPurchaseOrder(id: string, tenantId: string): Promise<PurchaseOrder> {
    const po = await this.findPurchaseOrderById(id, tenantId);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft POs can be sent');
    }

    po.status = PurchaseOrderStatus.SENT;
    po.requestedDate = new Date();
    await this.poRepo.save(po);
    return this.findPurchaseOrderById(id, tenantId);
  }

  async receivePurchaseOrder(id: string, dto: ReceivePODto, performedBy: string, tenantId: string): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const lineRepo = manager.getRepository(PoLineItem);
      const stockRepo = manager.getRepository(InventoryStock);
      const txRepo = manager.getRepository(InventoryTransaction);

      const po = await this.findPurchaseOrderById(id, tenantId, manager);

      if (po.status === PurchaseOrderStatus.RECEIVED || po.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot receive a completed or cancelled PO');
      }

      let allReceived = true;
      let anyReceived = false;

      for (const item of dto.lineItems) {
        const lineItem = po.lineItems.find((li) => li.id === item.lineItemId);
        if (!lineItem) throw new NotFoundException(`Line item ${item.lineItemId} not found`);

        if (item.qtyReceived > 0) {
          anyReceived = true;
          lineItem.qtyReceived += item.qtyReceived;
          await lineRepo.save(lineItem);

          // Update stock
          let stock = await stockRepo.findOne({ where: { partId: lineItem.partId, storeroomId: lineItem.storeroomId } });
          if (!stock) {
            stock = stockRepo.create({ partId: lineItem.partId, storeroomId: lineItem.storeroomId, tenantId, qtyOnHand: 0, qtyReserved: 0, qtyOnOrder: 0 });
          }
          stock.qtyOnHand += item.qtyReceived;
          stock.qtyOnOrder = Math.max(0, stock.qtyOnOrder - item.qtyReceived);
          await stockRepo.save(stock);

          // Create transaction
          const tx = txRepo.create({
            partId: lineItem.partId,
            storeroomId: lineItem.storeroomId,
            tenantId,
            type: TransactionType.RECEIVE,
            qty: item.qtyReceived,
            unitCost: lineItem.unitCost,
            notes: dto.notes,
            referenceId: po.id,
            referenceType: 'PurchaseOrder',
            performedBy,
          });
          await txRepo.save(tx);
        }

        if (lineItem.qtyReceived < lineItem.qtyOrdered) {
          allReceived = false;
        }
      }

      // Update PO status
      if (allReceived) {
        po.status = PurchaseOrderStatus.RECEIVED;
        po.receivedDate = new Date();
      } else if (anyReceived) {
        po.status = PurchaseOrderStatus.PARTIAL;
      }

      await poRepo.save(po);
      return this.findPurchaseOrderById(id, tenantId, manager);
    });
  }

  async cancelPurchaseOrder(id: string, tenantId: string): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const stockRepo = manager.getRepository(InventoryStock);

      const po = await this.findPurchaseOrderById(id, tenantId, manager);

      if (po.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('Cannot cancel a received PO');
      }

      // Reduce qtyOnOrder for unreceived quantities
      for (const lineItem of po.lineItems) {
        const unreceived = lineItem.qtyOrdered - lineItem.qtyReceived;
        if (unreceived > 0) {
          const stock = await stockRepo.findOne({ where: { partId: lineItem.partId, storeroomId: lineItem.storeroomId } });
          if (stock) {
            stock.qtyOnOrder = Math.max(0, stock.qtyOnOrder - unreceived);
            await stockRepo.save(stock);
          }
        }
      }

      po.status = PurchaseOrderStatus.CANCELLED;
      await poRepo.save(po);
      return this.findPurchaseOrderById(id, tenantId, manager);
    });
  }
}
