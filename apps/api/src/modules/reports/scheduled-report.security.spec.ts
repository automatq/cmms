import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/scheduled-report.dto';
import { ExportService } from './export.service';

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});
const body = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });

const valid = {
  name: 'Weekly WOs',
  reportType: 'work_orders',
  schedule: '0 8 * * 1',
  recipientEmails: ['ops@corp.com'],
  format: 'csv',
};

describe('Scheduled report input', () => {
  it('accepts a valid create body', async () => {
    await expect(pipe.transform(valid, body(CreateScheduledReportDto))).resolves.toBeInstanceOf(
      CreateScheduledReportDto,
    );
  });

  it.each(['tenantId', 'id', 'createdBy'])('rejects %s in an update body', async (field) => {
    await expect(
      pipe.transform({ [field]: 'b1f0c1a8-0000-4000-8000-000000000000' }, body(UpdateScheduledReportDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed emails and cron strings', async () => {
    await expect(
      pipe.transform({ ...valid, recipientEmails: ['nope'] }, body(CreateScheduledReportDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform({ ...valid, schedule: 'every day' }, body(CreateScheduledReportDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('service update never changes tenantId even if one slips through', async () => {
    const stored = { id: 'r1', tenantId: 'tenant-a', name: 'x' };
    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...stored }),
      save: jest.fn().mockImplementation(async (r) => r),
    };
    const service = new ExportService(repo as any, {} as any);
    const saved = await service.updateScheduledReport(
      'r1',
      { name: 'renamed', tenantId: 'tenant-b' } as any,
      'tenant-a',
    );
    expect(saved.tenantId).toBe('tenant-a');
    expect(saved.name).toBe('renamed');
  });
});
