import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceContract, ContractStatus } from './entities/service-contract.entity';
import { Supplier } from './entities/supplier.entity';
import { Asset } from '../assets/entities/asset.entity';
import {
  assertTenantRefs,
  stripForeignTenantRelations,
} from '../../common/tenant/assert-tenant-refs';

@Injectable()
export class ServiceContractsService {
  constructor(
    @InjectRepository(ServiceContract)
    private readonly contractRepository: Repository<ServiceContract>,
  ) {}

  private assertContractRefs(dto: Partial<ServiceContract> & { assetIds?: string[] }, tenantId: string) {
    return assertTenantRefs(this.contractRepository.manager, tenantId, [
      { entity: Supplier, id: dto.supplierId, field: 'supplierId' },
      { entity: Asset, id: dto.assetIds, field: 'assetIds' },
    ]);
  }

  async create(dto: Partial<ServiceContract>, tenantId: string): Promise<ServiceContract> {
    await this.assertContractRefs(dto, tenantId);
    const contract = this.contractRepository.create({ ...dto, tenantId });
    return this.contractRepository.save(contract);
  }

  async findAll(tenantId: string): Promise<ServiceContract[]> {
    return this.contractRepository.find({
      where: { tenantId },
      relations: ['supplier', 'assets'],
      order: { endDate: 'ASC' },
    }).then((rows) => stripForeignTenantRelations(rows, tenantId));
  }

  async findOne(id: string, tenantId: string): Promise<ServiceContract> {
    const contract = await this.contractRepository.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'assets'],
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return stripForeignTenantRelations(contract, tenantId);
  }

  async update(id: string, dto: Partial<ServiceContract>, tenantId: string): Promise<ServiceContract> {
    const contract = await this.findOne(id, tenantId);
    await this.assertContractRefs(dto, tenantId);
    Object.assign(contract, dto);
    return this.contractRepository.save(contract);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const contract = await this.findOne(id, tenantId);
    await this.contractRepository.remove(contract);
  }

  getContractStatus(contract: ServiceContract): ContractStatus {
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (contract.status === ContractStatus.CANCELLED) return ContractStatus.CANCELLED;
    if (endDate < now) return ContractStatus.EXPIRED;
    if (endDate <= thirtyDaysFromNow) return ContractStatus.EXPIRING;
    return ContractStatus.ACTIVE;
  }

  async getExpiringContracts(tenantId: string, withinDays = 30): Promise<ServiceContract[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return this.contractRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.supplier', 'supplier')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.end_date <= :futureDate', { futureDate })
      .andWhere('c.end_date >= :now', { now: new Date() })
      .andWhere('c.status != :cancelled', { cancelled: ContractStatus.CANCELLED })
      .orderBy('c.end_date', 'ASC')
      .getMany();
  }
}
