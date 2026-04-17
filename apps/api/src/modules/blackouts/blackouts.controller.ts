import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlackoutsService } from './blackouts.service';
import { CreateBlackoutDto } from './dto/create-blackout.dto';
import { UpdateBlackoutDto } from './dto/update-blackout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Blackouts')
@ApiBearerAuth()
@Controller('blackouts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BlackoutsController {
  constructor(private readonly blackoutsService: BlackoutsService) {}

  @Get()
  @Permissions('pm:read')
  @ApiOperation({ summary: 'List blackout periods' })
  @ApiResponse({ status: 200, description: 'List of blackout periods' })
  findAll(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.blackoutsService.findAll(user.tenantId, from, to);
  }

  @Post()
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Create a blackout period' })
  @ApiResponse({ status: 201, description: 'Blackout period created' })
  create(@Body() dto: CreateBlackoutDto, @CurrentUser() user: RequestUser) {
    return this.blackoutsService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update a blackout period' })
  @ApiResponse({ status: 200, description: 'Blackout period updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlackoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.blackoutsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Delete a blackout period' })
  @ApiResponse({ status: 200, description: 'Blackout period deleted' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.blackoutsService.delete(id, user.tenantId);
  }
}

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants/me')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantWorkingDaysController {
  constructor(private readonly blackoutsService: BlackoutsService) {}

  @Get('working-days')
  @Permissions('pm:read')
  @ApiOperation({ summary: 'Get tenant working days (0=Sun … 6=Sat)' })
  @ApiResponse({ status: 200, description: 'Working days' })
  async getWorkingDays(@CurrentUser() user: RequestUser) {
    const workingDays = await this.blackoutsService.getWorkingDays(user.tenantId);
    return { workingDays };
  }

  @Patch('working-days')
  @Permissions('pm:write')
  @ApiOperation({ summary: 'Update tenant working days' })
  @ApiResponse({ status: 200, description: 'Working days updated' })
  async setWorkingDays(
    @Body() body: { workingDays: number[] },
    @CurrentUser() user: RequestUser,
  ) {
    const days = body.workingDays;
    if (!Array.isArray(days) || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      throw new BadRequestException('workingDays must be an array of integers 0-6');
    }
    const normalized = Array.from(new Set(days)).sort();
    const workingDays = await this.blackoutsService.setWorkingDays(user.tenantId, normalized);
    return { workingDays };
  }
}
