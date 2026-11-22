import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { auth } from './better-auth';
import { BETTER_AUTH } from './better-auth.token';

@Global()
@Module({
  imports: [ConfigModule],
  // The same Better Auth instance main.ts mounts at /api/auth and the
  // realtime gateway uses, so hooks and config apply everywhere.
  providers: [{ provide: BETTER_AUTH, useValue: auth }, JwtAuthGuard, PermissionsGuard],
  exports: [BETTER_AUTH, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
