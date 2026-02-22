import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';
import { AuditLog } from './entities/audit-log.entity';
import { UsersService } from './users.service';
import { UsersController, RolesController, OrganizationController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Organization, AuditLog])],
  providers: [UsersService],
  controllers: [UsersController, RolesController, OrganizationController],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seedDefaultRoles();
  }
}
