import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays } from 'date-fns';
import { resolveTimeZone, zonedParts } from '../../common/time/tenant-time';
import { BlackoutPeriod } from './entities/blackout-period.entity';
import { Tenant } from '../users/entities/tenant.entity';
import { CreateBlackoutDto } from './dto/create-blackout.dto';
import { UpdateBlackoutDto } from './dto/update-blackout.dto';

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const MAX_SHIFT_DAYS = 365;

@Injectable()
export class BlackoutsService {
  constructor(
    @InjectRepository(BlackoutPeriod)
    private readonly blackoutRepository: Repository<BlackoutPeriod>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(dto: CreateBlackoutDto, tenantId: string): Promise<BlackoutPeriod> {
    const startDate = dto.startDate;
    const endDate = dto.endDate ?? dto.startDate;

    const blackout = this.blackoutRepository.create({
      tenantId,
      startDate,
      endDate,
      name: dto.name ?? null,
    });
    return this.blackoutRepository.save(blackout);
  }

  async findAll(
    tenantId: string,
    from?: string,
    to?: string,
  ): Promise<BlackoutPeriod[]> {
    const qb = this.blackoutRepository
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .orderBy('b.startDate', 'ASC');

    if (from && to) {
      qb.andWhere('b.endDate >= :from AND b.startDate <= :to', { from, to });
    } else if (from) {
      qb.andWhere('b.endDate >= :from', { from });
    } else if (to) {
      qb.andWhere('b.startDate <= :to', { to });
    }

    return qb.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<BlackoutPeriod> {
    const blackout = await this.blackoutRepository.findOne({
      where: { id, tenantId },
    });
    if (!blackout) throw new NotFoundException(`Blackout ${id} not found`);
    return blackout;
  }

  async update(
    id: string,
    dto: UpdateBlackoutDto,
    tenantId: string,
  ): Promise<BlackoutPeriod> {
    const blackout = await this.findOne(id, tenantId);
    Object.assign(blackout, dto);
    return this.blackoutRepository.save(blackout);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const blackout = await this.findOne(id, tenantId);
    await this.blackoutRepository.remove(blackout);
  }

  async getWorkingDays(tenantId: string): Promise<number[]> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    const raw = (tenant?.settings as Record<string, unknown> | undefined)?.workingDays;
    if (Array.isArray(raw) && raw.every((d) => typeof d === 'number')) {
      return raw as number[];
    }
    return DEFAULT_WORKING_DAYS;
  }

  async setWorkingDays(tenantId: string, workingDays: number[]): Promise<number[]> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    const settings = { ...(tenant.settings ?? {}), workingDays };
    tenant.settings = settings;
    await this.tenantRepository.save(tenant);
    return workingDays;
  }

  /** Working days + timezone for a tenant, loaded once per calculation. */
  async getCalendar(tenantId: string): Promise<{ workingDays: number[]; timeZone: string }> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    const raw = (tenant?.settings as Record<string, unknown> | undefined)?.workingDays;
    const workingDays =
      Array.isArray(raw) && raw.every((d) => typeof d === 'number') ? (raw as number[]) : DEFAULT_WORKING_DAYS;
    return { workingDays, timeZone: resolveTimeZone(tenant?.timezone) };
  }

  async getTimeZone(tenantId: string): Promise<string> {
    return (await this.getCalendar(tenantId)).timeZone;
  }

  /**
   * Whether `date` falls on a non-working day or blackout date, judged in the
   * tenant's own timezone (a Monday 07:00 in Tokyo is still Sunday in UTC).
   */
  async isBlackout(
    date: Date,
    tenantId: string,
    calendar?: { workingDays: number[]; timeZone: string },
  ): Promise<boolean> {
    const cal = calendar ?? (await this.getCalendar(tenantId));
    const local = zonedParts(date, cal.timeZone);
    if (!cal.workingDays.includes(local.weekday)) return true;

    const hit = await this.blackoutRepository
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.startDate <= :iso AND b.endDate >= :iso', { iso: local.ymd })
      .getCount();
    return hit > 0;
  }

  async nextWorkingDay(date: Date, tenantId: string): Promise<Date> {
    const calendar = await this.getCalendar(tenantId);
    let candidate = date;
    for (let i = 0; i < MAX_SHIFT_DAYS; i++) {
      if (!(await this.isBlackout(candidate, tenantId, calendar))) return candidate;
      candidate = addDays(candidate, 1);
    }
    return candidate;
  }
}
