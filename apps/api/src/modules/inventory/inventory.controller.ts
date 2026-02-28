import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
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
import { TransactionType } from './entities/inventory-transaction.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

// ==================== SUPPLIERS CONTROLLER ====================
@RequireFeature('inventory')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.createSupplier(dto, user.tenantId);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@CurrentUser() user: RequestUser, @Query('activeOnly') activeOnly?: string) {
    return this.inventoryService.findAllSuppliers(user.tenantId, activeOnly === 'true');
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findSupplierById(id, user.tenantId);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.updateSupplier(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.deleteSupplier(id, user.tenantId);
  }
}

// ==================== PARTS CONTROLLER ====================
@RequireFeature('inventory')
@Controller('parts')
export class PartsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreatePartDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.createPart(dto, user.tenantId);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query() query: PartQueryDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findAllParts(query, user.tenantId);
  }

  @Get('categories')
  @Permissions('inventory:read')
  getCategories(@CurrentUser() user: RequestUser) {
    return this.inventoryService.getPartCategories(user.tenantId);
  }

  @Get('low-stock')
  @Permissions('inventory:read')
  getLowStock(@CurrentUser() user: RequestUser) {
    return this.inventoryService.getLowStockParts(user.tenantId);
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findPartById(id, user.tenantId);
  }

  @Get(':id/stock')
  @Permissions('inventory:read')
  getStock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.getStockForPart(id, user.tenantId);
  }

  @Get(':id/stock/total')
  @Permissions('inventory:read')
  getTotalStock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.getTotalStockForPart(id, user.tenantId);
  }

  @Get('sku/:sku')
  @Permissions('inventory:read')
  findBySku(@Param('sku') sku: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findPartBySku(sku, user.tenantId);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.updatePart(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.deletePart(id, user.tenantId);
  }
}

// ==================== STOREROOMS CONTROLLER ====================
@RequireFeature('inventory')
@Controller('storerooms')
export class StoreroomsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreateStoreroomDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.createStoreroom(dto, user.tenantId);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@CurrentUser() user: RequestUser, @Query('activeOnly') activeOnly?: string) {
    return this.inventoryService.findAllStorerooms(user.tenantId, activeOnly === 'true');
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findStoreroomById(id, user.tenantId);
  }

  @Get(':id/stock')
  @Permissions('inventory:read')
  getStock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.getStockForStoreroom(id, user.tenantId);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreroomDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.updateStoreroom(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.deleteStoreroom(id, user.tenantId);
  }
}

// ==================== STOCK CONTROLLER ====================
@RequireFeature('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('receive')
  @Permissions('inventory:write')
  receiveStock(@Body() dto: ReceiveStockDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.receiveStock(dto, user.userId, user.tenantId);
  }

  @Post('issue')
  @Permissions('inventory:write')
  issueStock(@Body() dto: IssueStockDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.issueStock(dto, user.userId, user.tenantId);
  }

  @Post('adjust')
  @Permissions('inventory:write')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.adjustStock(dto, user.userId, user.tenantId);
  }

  @Post('transfer')
  @Permissions('inventory:write')
  transferStock(@Body() dto: TransferStockDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.transferStock(dto, user.userId, user.tenantId);
  }

  @Post('reserve')
  @Permissions('inventory:write')
  reserveStock(@Body() dto: ReserveStockDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.reserveStock(dto, user.userId, user.tenantId);
  }

  @Post('release')
  @Permissions('inventory:write')
  releaseReservation(@Body() dto: ReleaseReservationDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.releaseReservation(dto, user.userId, user.tenantId);
  }

  @Get('transactions')
  @Permissions('inventory:read')
  getTransactions(
    @CurrentUser() user: RequestUser,
    @Query('partId') partId?: string,
    @Query('storeroomId') storeroomId?: string,
    @Query('transactionType') transactionType?: TransactionType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getTransactionHistory(
      {
        partId,
        storeroomId,
        transactionType,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
      user.tenantId,
    );
  }

  @Get('stock/:partId/:storeroomId')
  @Permissions('inventory:read')
  getStockLevel(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Param('storeroomId', ParseUUIDPipe) storeroomId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventoryService.getStockLevel(partId, storeroomId, user.tenantId);
  }
}

// ==================== PURCHASE ORDERS CONTROLLER ====================
@RequireFeature('inventory')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.createPurchaseOrder(dto, user.userId, user.tenantId);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query() query: POQueryDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findAllPurchaseOrders(query, user.tenantId);
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.findPurchaseOrderById(id, user.tenantId);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseOrderDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.updatePurchaseOrder(id, dto, user.tenantId);
  }

  @Post(':id/send')
  @Permissions('inventory:write')
  send(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.sendPurchaseOrder(id, user.tenantId);
  }

  @Post(':id/receive')
  @Permissions('inventory:write')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePODto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventoryService.receivePurchaseOrder(id, dto, user.userId, user.tenantId);
  }

  @Post(':id/cancel')
  @Permissions('inventory:write')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.inventoryService.cancelPurchaseOrder(id, user.tenantId);
  }
}
