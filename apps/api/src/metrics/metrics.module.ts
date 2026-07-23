import { Module } from '@nestjs/common';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { HTTP_REQUEST_DURATION, HttpMetricsMiddleware } from './http-metrics.middleware';

const httpRequestDurationProvider = makeHistogramProvider({
  name: HTTP_REQUEST_DURATION,
  help: 'Durée des requêtes HTTP en secondes, ventilée par méthode, route et code de statut',
  labelNames: ['method', 'route', 'status_code'],
  // Bornes en secondes, resserrées sous la seconde : c'est là que se joue la
  // qualité de service d'une API. Au-delà de 10 s, l'utilisateur a décroché.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

@Module({
  providers: [HttpMetricsMiddleware, httpRequestDurationProvider],
  // L'histogramme doit être exporté au même titre que le middleware : NestJS
  // instancie ce dernier dans le module qui appelle consumer.apply(), donc
  // AppModule, qui doit pouvoir résoudre la dépendance lui-même.
  exports: [HttpMetricsMiddleware, httpRequestDurationProvider],
})
export class MetricsModule {}
