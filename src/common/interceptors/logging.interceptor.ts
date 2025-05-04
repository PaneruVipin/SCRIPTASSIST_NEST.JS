import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  // this fields we don't wanna show in logs coz they sensitive
  private readonly sensitiveFields = [
    'password',
    'access_token',
    'authorization',
    'ip',
    'token',
    'accesstoken',
    'refreshtoken',
    'apikey',
    'secret',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const userId = req.user?.id || 'anonymous'; // if no user, show as anonymous
    const now = Date.now(); // to calc time taken

    // making clone of req data and hiding sensitive stuff
    const safeBody = this.makePreview({ ...req.body });
    const safeQuery = this.makePreview({ ...req.query });
    const safeParams = this.makePreview({ ...req.params });
    const safeHeaders = this.makePreview({ ...req.headers });

    // 👉 log the incoming request here (body, params etc)
    this.logger.log(
      `➡️ Request: ${method} ${url} 
User: ${userId} 
Params: ${safeParams} 
Query: ${safeQuery} 
Body: ${safeBody} 
Headers: ${safeHeaders}`
    );

    // then we wait for response or error
    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - now;

          // again we redact response if needed (just in case token etc is there)
          const safeResponse = this.makePreview({ ...response });

          this.logger.log(
            `✅ Response: ${method} ${url} | User: ${userId} | Duration: ${duration}ms`
          );

          this.logger.debug(
            `[Response Preview] ${safeResponse}` // extra curly removed
          );
        },
        error: (err) => {
          const duration = Date.now() - now;

          // ❌ sometimes error happens before controller hit, so we log all req data here again
          this.logger.error(
            `❌ Error: ${method} ${url} | User: ${userId} | Duration: ${duration}ms | Message: ${err.message}`,
            `
Params: ${safeParams} 
Query: ${safeQuery} 
Body: ${safeBody} 
Headers: ${safeHeaders}`
          );
        },
      }),
    );
  }

  // 🔐 this make sure to hide fields like password, token etc in logs
  private redactSensitiveData(data: Record<string, any>): Record<string, any> {
    for (const key of Object.keys(data)) {
      if (this.sensitiveFields.includes(key.toLowerCase())) {
        data[key] = '[REDACTED]'; // just put redacted if its sensitive
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        data[key] = this.redactSensitiveData(data[key]); // also go deep if nested
      }
    }
    return data;
  }

  // 📦 show preview of data (hide sensitive + trim long strings)
  private makePreview(data: Record<string, any>): string {
    try {
      let preview = JSON.stringify(this.redactSensitiveData(data)).slice(0, 500);
      return `${preview}${preview.length >= 500 ? '... [truncated]' : ''}`;
    } catch (err) {
      return '[Unserializable Data]'; // incase JSON.stringify fails (circular etc)
    }
  }
}
