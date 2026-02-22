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

// ==================== SUPPLIERS CONTROLLER ====================
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.inventoryService.findAllSuppliers(activeOnly === 'true');
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findSupplierById(id);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.deleteSupplier(id);
  }
}

// ==================== PARTS CONTROLLER ====================
@Controller('parts')
export class PartsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreatePartDto) {
    return this.inventoryService.createPart(dto);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query() query: PartQueryDto) {
    return this.inventoryService.findAllParts(query);
  }

  @Get('categories')
  @Permissions('inventory:read')
  getCategories() {
    return this.inventoryService.getPartCategories();
  }

  @Get('low-stock')
  @Permissions('inventory:read')
  getLowStock() {
    return this.inventoryService.getLowStockParts();
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findPartById(id);
  }

  @Get(':id/stock')
  @Permissions('inventory:read')
  getStock(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getStockForPart(id);
  }

  @Get(':id/stock/total')
  @Permissions('inventory:read')
  getTotalStock(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getTotalStockForPart(id);
  }

  @Get('sku/:sku')
  @Permissions('inventory:read')
  findBySku(@Param('sku') sku: string) {
    return this.inventoryService.findPartBySku(sku);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartDto) {
    return this.inventoryService.updatePart(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.deletePart(id);
  }
}

// ==================== STOREROOMS CONTROLLER ====================
@Controller('storerooms')
export class StoreroomsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreateStoreroomDto) {
    return this.inventoryService.createStoreroom(dto);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.inventoryService.findAllStorerooms(activeOnly === 'true');
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findStoreroomById(id);
  }

  @Get(':id/stock')
  @Permissions('inventory:read')
  getStock(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getStockForStoreroom(id);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreroomDto) {
    return this.inventoryService.updateStoreroom(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.deleteStoreroom(id);
  }
}

// ==================== STOCK CONTROLLER ====================
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('receive')
  @Permissions('inventory:write')
  receiveStock(@Body() dto: ReceiveStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.receiveStock(dto, userId);
  }

  @Post('issue')
  @Permissions('inventory:write')
  issueStock(@Body() dto: IssueStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.issueStock(dto, userId);
  }

  @Post('adjust')
  @Permissions('inventory:write')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Post('transfer')
  @Permissions('inventory:write')
  transferStock(@Body() dto: TransferStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.transferStock(dto, userId);
  }

  @Post('reserve')
  @Permissions('inventory:write')
  reserveStock(@Body() dto: ReserveStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.reserveStock(dto, userId);
  }

  @Post('release')
  @Permissions('inventory:write')
  releaseReservation(@Body() dto: ReleaseReservationDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.releaseReservation(dto, userId);
  }

  @Get('transactions')
  @Permissions('inventory:read')
  getTransactions(
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
    );
  }

  @Get('stock/:partId/:storeroomId')
  @Permissions('inventory:read')
  getStockLevel(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Param('storeroomId', ParseUUIDPipe) storeroomId: string,
  ) {
    return this.inventoryService.getStockLevel(partId, storeroomId);
  }
}

// ==================== PURCHASE ORDERS CONTROLLER ====================
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Permissions('inventory:write')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.createPurchaseOrder(dto, userId);
  }

  @Get()
  @Permissions('inventory:read')
  findAll(@Query() query: POQueryDto) {
    return this.inventoryService.findAllPurchaseOrders(query);
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findPurchaseOrderById(id);
  }

  @Put(':id')
  @Permissions('inventory:write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.inventoryService.updatePurchaseOrder(id, dto);
  }

  @Post(':id/send')
  @Permissions('inventory:write')
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.sendPurchaseOrder(id);
  }

  @Post(':id/receive')
  @Permissions('inventory:write')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePODto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.receivePurchaseOrder(id, dto, userId);
  }

  @Post(':id/cancel')
  @Permissions('inventory:write')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.cancelPurchaseOrder(id);
  }
}
