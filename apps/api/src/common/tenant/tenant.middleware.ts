import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

/**
 * Middleware that sets the PostgreSQL session variable `app.current_tenant_id`
 * for Row-Level Security (RLS) enforcement.
 *
 * This runs AFTER authentication (so req.user is populated) and BEFORE
 * any controller/service code executes.
 *
 * Defense-in-depth: Even if application code forgets to filter by tenantId,
 * RLS will block cross-tenant data access at the database level.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (user?.tenantId) {
      // Check tenant subscription status
      const [tenant] = await this.dataSource.query(
        `SELECT status FROM tenants WHERE id = $1`,
        [user.tenantId],
      );

      if (tenant && (tenant.status === 'suspended' || tenant.status === 'cancelled')) {
        throw new HttpException(
          { message: 'Subscription inactive. Please update your billing to continue.', status: tenant.status },
          402,
        );
      }

      // Set the PostgreSQL session variable for RLS
      // Using a parameterized query to prevent SQL injection
      await this.dataSource.query(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        [user.tenantId],
      );

      // Also attach tenantId directly on the request for convenience
      (req as any).tenantId = user.tenantId;
    }

    next();
  }
}
