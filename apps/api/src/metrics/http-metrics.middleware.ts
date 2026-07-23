import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import type { NextFunction, Request, Response } from 'express';

export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';

export type HttpMetricLabel = 'method' | 'route' | 'status_code';

/** Express type `route` en `any` : on le refranchit vers `string` proprement. */
function readRoutePath(route: unknown): string | undefined {
  if (typeof route !== 'object' || route === null) {
    return undefined;
  }

  const path = (route as Record<string, unknown>).path;

  return typeof path === 'string' ? path : undefined;
}

/**
 * Renvoie le motif de route ('/albums/:id') plutôt que l'URL brute ('/albums/42').
 * Sans ça, Prometheus crée une série temporelle par identifiant et la cardinalité
 * explose. Les requêtes qui ne correspondent à aucune route (scans, 404) sont
 * regroupées sous 'unmatched' pour la même raison.
 */
export function resolveRoutePattern(request: Request): string {
  const pattern = readRoutePath(request.route);

  if (pattern === undefined) {
    return 'unmatched';
  }

  const fullPattern = `${request.baseUrl ?? ''}${pattern}`;

  return fullPattern === '' ? '/' : fullPattern;
}

/**
 * Alimente l'histogramme des requêtes HTTP, qui porte à lui seul trois des quatre
 * signaux dorés : la latence (via les buckets), le trafic et le taux d'erreur
 * (via le compteur d'occurrences ventilé par code de statut).
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly requestDuration: Histogram<HttpMetricLabel>,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const stopTimer = this.requestDuration.startTimer();

    // 'finish' se déclenche quand la réponse part réellement, quelle qu'en soit
    // l'origine : contrôleur, guard (429 du throttler, rejet CSRF) ou filtre
    // d'exception. Un intercepteur NestJS raterait les guards, qui s'exécutent
    // avant lui dans le cycle de vie de la requête.
    response.once('finish', () => {
      stopTimer({
        method: request.method,
        route: resolveRoutePattern(request),
        status_code: String(response.statusCode),
      });
    });

    next();
  }
}
