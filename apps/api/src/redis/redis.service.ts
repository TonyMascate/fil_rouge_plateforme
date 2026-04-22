import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      host: config.getOrThrow('REDIS_HOST'),
      port: parseInt(config.getOrThrow('REDIS_PORT'), 10),
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
