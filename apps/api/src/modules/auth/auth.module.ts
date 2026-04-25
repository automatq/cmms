import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Auth0TokenService } from './auth0-token.service';

@Global()
@Module({
  imports: [
    ConfigModule,
  ],
  providers: [Auth0TokenService, JwtAuthGuard, PermissionsGuard],
  exports: [Auth0TokenService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
