import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

const mockDisconnect = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(function (this: any) {
    this.disconnect = mockDisconnect;
  });
});

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'REDIS_HOST') return 'localhost';
    if (key === 'REDIS_PORT') return '6379';
    return 'default';
  }),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return '6379';
      return 'default';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('initialise la connexion Redis avec le bon host et port', () => {
    const ioredis = require('ioredis') as jest.Mock;
    expect(ioredis).toHaveBeenCalledWith({ host: 'localhost', port: 6379 });
  });

  describe('onModuleDestroy', () => {
    it('appelle disconnect() à la destruction du module', () => {
      service.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
