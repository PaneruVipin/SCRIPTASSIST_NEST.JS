import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';  // From @nestjs/cache-manager
import * as redisStore from 'cache-manager-ioredis';  // Redis store for caching
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from '@common/services/cache.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
        ttl: 10000
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CommonModule {}
