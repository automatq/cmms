import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BetterAuthModule } from 'nestjs-better-auth';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { auth } from './better-auth';

@Global()
@Module({
  imports: [
    ConfigModule,
    BetterAuthModule.forRoot({ betterAuthConfig: auth.options }),
  ],
  providers: [JwtAuthGuard, PermissionsGuard],
  exports: [JwtAuthGuard, PermissionsGuard, BetterAuthModule],
})
export class AuthModule {}
