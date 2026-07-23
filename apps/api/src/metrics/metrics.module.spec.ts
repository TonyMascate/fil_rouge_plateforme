import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Test } from '@nestjs/testing';
import { MetricsModule } from './metrics.module';
import { HttpMetricsMiddleware } from './http-metrics.middleware';

/**
 * Reproduit le câblage réel : c'est le module hôte qui applique le middleware,
 * donc c'est lui qui doit pouvoir résoudre l'histogramme. Les tests unitaires du
 * middleware construisent l'objet à la main et ne couvrent pas ce chemin.
 */
@Module({ imports: [MetricsModule] })
class HostModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

describe('MetricsModule', () => {
  it("permet au module hôte d'instancier le middleware appliqué via consumer.apply", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrometheusModule.register(), HostModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    await expect(app.init()).resolves.toBeDefined();

    await app.close();
  });
});
