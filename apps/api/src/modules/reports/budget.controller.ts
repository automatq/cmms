import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({ status: 200, description: 'List of budgets' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.budgetService.findAll(user.tenantId);
  }

  @Get('summary')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get budget summary with actual spend' })
  @ApiResponse({ status: 200, description: 'Budget summary' })
  getSummary(@CurrentUser() user: RequestUser) {
    return this.budgetService.getBudgetSummary(user.tenantId);
  }

  @Get(':id')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.budgetService.findOne(id, user.tenantId);
  }

  @Get(':id/vs-actual')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get budget vs actual variance' })
  @ApiResponse({ status: 200, description: 'Budget variance report' })
  getVsActual(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.budgetService.getBudgetVsActual(id, user.tenantId);
  }

  @Post()
  @Permissions('reports:write')
  @ApiOperation({ summary: 'Create a budget' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  create(
    @Body() dto: CreateBudgetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('reports:write')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({ status: 200, description: 'Budget updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('reports:write')
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 200, description: 'Budget deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.budgetService.delete(id, user.tenantId);
  }
}
