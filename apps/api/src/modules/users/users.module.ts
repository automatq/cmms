import { Module } from '@nestjs/common';
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
import { TenantModule } from '../../common/tenant/tenant.module';

// Default roles are seeded by migration SeedDefaultTenantAndUser1714000001000.
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Tenant, Team, AuditLog]), TenantModule],
  providers: [UsersService, TeamsService],
  controllers: [UsersController, RolesController, OrganizationController, TeamsController],
  exports: [UsersService, TeamsService],
})
export class UsersModule {}
