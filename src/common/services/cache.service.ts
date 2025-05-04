import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { isString } from 'class-validator';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly namespace = 'app'; // Namespace for key isolation

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
  }

  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private isValidKey(key: any): key is string {
    return isString(key) && key.trim().length > 0;
  }

  async set<T = any>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (!this.isValidKey(key)) {
      this.logger.warn(`Invalid cache key provided: "${key}"`);
      return;
    }

    const namespacedKey = this.getNamespacedKey(key);
    try {
      const serializedValue = JSON.stringify(value);
      await this.cacheManager.set(namespacedKey, serializedValue, ttlSeconds);
      this.logger.debug(`Cache set: ${namespacedKey}`);
    } catch (error:any) {
      this.logger.error(`Failed to set cache key: ${namespacedKey}`, error.stack);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isValidKey(key)) return null;

    const namespacedKey = this.getNamespacedKey(key);
    try {
      const value = await this.cacheManager.get<string>(namespacedKey);
      if (value === undefined || value === null) {
        this.logger.debug(`Cache miss: ${namespacedKey}`);
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error:any) {
      this.logger.error(`Failed to get cache key: ${namespacedKey}`, error.stack);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isValidKey(key)) return false;

    const namespacedKey = this.getNamespacedKey(key);
    try {
      await this.cacheManager.del(namespacedKey);
      this.logger.debug(`Cache deleted: ${namespacedKey}`);
      return true;
    } catch (error:any) {
      this.logger.error(`Failed to delete cache key: ${namespacedKey}`, error.stack);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.warn(`Entire cache cleared`);
    } catch (error:any) {
      this.logger.error(`Failed to clear cache`, error.stack);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isValidKey(key)) return false;

    const namespacedKey = this.getNamespacedKey(key);
    try {
      const value = await this.cacheManager.get(namespacedKey);
      return value !== undefined && value !== null;
    } catch (error:any) {
      this.logger.error(`Failed to check existence for key: ${namespacedKey}`, error.stack);
      return false;
    }
  }

  //  Get multiple keys at once (bulk operation)
  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  // Set multiple keys at once
  async setMany(entries: { key: string; value: any; ttl?: number }[]): Promise<void> {
    await Promise.all(entries.map(entry =>
      this.set(entry.key, entry.value, entry.ttl ?? 300),
    ));
  }

  // Delete multiple keys at once
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }
 
}
