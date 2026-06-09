import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WoTemplate } from './entities';
import { CreateWoTemplateDto, UpdateWoTemplateDto } from './dto';

@Injectable()
export class WoTemplatesService {
  constructor(
    @InjectRepository(WoTemplate)
    private readonly templateRepository: Repository<WoTemplate>,
  ) {}

  async create(dto: CreateWoTemplateDto, tenantId: string): Promise<WoTemplate> {
    const template = this.templateRepository.create({ ...dto, tenantId });
    return this.templateRepository.save(template);
  }

  async findAll(tenantId: string): Promise<WoTemplate[]> {
    return this.templateRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<WoTemplate> {
    const template = await this.templateRepository.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundException(`Work order template ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateWoTemplateDto, tenantId: string): Promise<WoTemplate> {
    const template = await this.findOne(id, tenantId);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const template = await this.findOne(id, tenantId);
    await this.templateRepository.remove(template);
  }
}
