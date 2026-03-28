import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceContractsService } from './service-contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Service Contracts')
@ApiBearerAuth()
@Controller('service-contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceContractsController {
  constructor(private readonly contractsService: ServiceContractsService) {}

  @Get()
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get all service contracts' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.contractsService.findAll(user.tenantId);
  }

  @Get('expiring')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get expiring contracts' })
  getExpiring(
    @Query('days') days: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contractsService.getExpiringContracts(user.tenantId, parseInt(days || '30'));
  }

  @Get(':id')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get contract by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.contractsService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('inventory:write')
  @ApiOperation({ summary: 'Create service contract' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.contractsService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('inventory:write')
  @ApiOperation({ summary: 'Update service contract' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contractsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('inventory:write')
  @ApiOperation({ summary: 'Delete service contract' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.contractsService.delete(id, user.tenantId);
  }
}
