import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '@common/services/cache.service';
import { createHash } from 'crypto';
import { RATE_LIMIT_KEY, RateLimitOptions } from '@common/decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly NAMESPACE = 'rate-limit';

  constructor(
    private reflector: Reflector,
    private readonly cacheService: CacheService
  ) {}

  async canActivate(context: ExecutionContext ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    
    const rateLimit: RateLimitOptions = this.reflector.getAllAndOverride(RATE_LIMIT_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || {
      limit: 100,
      windowMs: 60_000,
    };
    const cacheKey = `${this.NAMESPACE}:${this.hashKey(ip)}`;
    const now = Date.now();
    const { limit, windowMs } = rateLimit;

    // Read count from cache
    const record = await this.cacheService.get<{ count: number; timestamp: number }>(cacheKey);
    if (record) {
      const timePassed = now - record.timestamp;

      if (timePassed < windowMs) {
        if (record.count >= limit) {
          throw new HttpException(
            {
              status: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Rate limit exceeded. Please try again later.',
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }

        // Increment count
        await this.cacheService.set(cacheKey, {
          count: record.count + 1,
          timestamp: record.timestamp,
        }, Math.ceil((windowMs - timePassed)));
      } else {
        // Reset window if past expiration
        await this.cacheService.set(cacheKey, { count: 1, timestamp: now }, windowMs);
      }
    } else {
      // First request — create cache entry
      await this.cacheService.set(cacheKey, { count: 1, timestamp: now }, windowMs);
    }

    return true;
  }


  private hashKey(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}