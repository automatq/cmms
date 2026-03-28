import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Tenant } from './entities/tenant.entity';
import { Team } from './entities/team.entity';
import { AuditLog } from './entities/audit-log.entity';
import { UsersService } from './users.service';
import { TeamsService } from './teams.service';
import { UsersController, RolesController, OrganizationController } from './users.controller';
import { TeamsController } from './teams.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Tenant, Team, AuditLog]), BillingModule],
  providers: [UsersService, TeamsService],
  controllers: [UsersController, RolesController, OrganizationController, TeamsController],
  exports: [UsersService, TeamsService],
})
export class UsersModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    // TODO: Multi-tenancy - seedDefaultRoles now requires a tenantId.
    // This should iterate over all existing tenants and seed roles for each,
    // or be called when a new tenant is provisioned.
    // For now, skipping automatic seeding on startup.
    // await this.usersService.seedDefaultRoles(tenantId);
  }
}
