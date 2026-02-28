import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const tenantId = req.user?.tenantId || 'anonymous';
    const userId = req.user?.userId || 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            JSON.stringify({
              method,
              url,
              statusCode: res.statusCode,
              duration,
              tenantId,
              userId,
            }),
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error(
            JSON.stringify({
              method,
              url,
              statusCode: err.status || 500,
              duration,
              tenantId,
              userId,
              error: err.message,
            }),
          );
        },
      }),
    );
  }
}
