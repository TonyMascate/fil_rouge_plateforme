import type { Request, Response } from 'express';
import { HttpMetricsMiddleware, resolveRoutePattern } from './http-metrics.middleware';

const buildHistogram = () => {
  const stopTimer = jest.fn();
  const startTimer = jest.fn().mockReturnValue(stopTimer);
  return { startTimer, _stopTimer: stopTimer };
};

const buildRequest = (overrides: Partial<Request> = {}) =>
  ({
    method: 'GET',
    baseUrl: '',
    route: { path: '/albums/:id' },
    ...overrides,
  }) as unknown as Request;

const buildResponse = (statusCode = 200) => {
  const handlers: Record<string, () => void> = {};
  return {
    statusCode,
    once: jest.fn((event: string, handler: () => void) => {
      handlers[event] = handler;
    }),
    _emit: (event: string) => handlers[event]?.(),
  };
};

describe('resolveRoutePattern', () => {
  it('renvoie le motif de route et non l’URL brute', () => {
    expect(resolveRoutePattern(buildRequest())).toBe('/albums/:id');
  });

  it('préfixe le motif avec le baseUrl du routeur', () => {
    const request = buildRequest({ baseUrl: '/api', route: { path: '/photos/:id' } } as Partial<Request>);

    expect(resolveRoutePattern(request)).toBe('/api/photos/:id');
  });

  it('tolère un baseUrl absent', () => {
    const request = buildRequest({ baseUrl: undefined, route: { path: '/health' } } as Partial<Request>);

    expect(resolveRoutePattern(request)).toBe('/health');
  });

  it('regroupe les requêtes sans route correspondante sous "unmatched"', () => {
    const request = buildRequest({ route: undefined } as Partial<Request>);

    expect(resolveRoutePattern(request)).toBe('unmatched');
  });

  it('renvoie "/" quand le motif résolu est vide', () => {
    const request = buildRequest({ baseUrl: '', route: { path: '' } } as Partial<Request>);

    expect(resolveRoutePattern(request)).toBe('/');
  });
});

describe('HttpMetricsMiddleware', () => {
  let histogram: ReturnType<typeof buildHistogram>;
  let middleware: HttpMetricsMiddleware;

  beforeEach(() => {
    histogram = buildHistogram();
    middleware = new HttpMetricsMiddleware(histogram as never);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('passe la main au maillon suivant', () => {
    const next = jest.fn();

    middleware.use(buildRequest(), buildResponse() as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('n’enregistre rien tant que la réponse n’est pas envoyée', () => {
    middleware.use(buildRequest(), buildResponse() as unknown as Response, jest.fn());

    expect(histogram.startTimer).toHaveBeenCalledTimes(1);
    expect(histogram._stopTimer).not.toHaveBeenCalled();
  });

  it('enregistre la durée avec méthode, route et code de statut à la fin de la réponse', () => {
    const request = buildRequest({ method: 'POST' } as Partial<Request>);
    const response = buildResponse(201);

    middleware.use(request, response as unknown as Response, jest.fn());
    response._emit('finish');

    expect(histogram._stopTimer).toHaveBeenCalledWith({
      method: 'POST',
      route: '/albums/:id',
      status_code: '201',
    });
  });

  it('capture les rejets émis par les guards, comme le 429 du throttler', () => {
    const request = buildRequest({ method: 'POST', route: { path: '/auth/login' } } as Partial<Request>);
    const response = buildResponse(429);

    middleware.use(request, response as unknown as Response, jest.fn());
    response._emit('finish');

    expect(histogram._stopTimer).toHaveBeenCalledWith({
      method: 'POST',
      route: '/auth/login',
      status_code: '429',
    });
  });

  it('s’abonne à "finish" une seule fois pour ne pas compter la requête deux fois', () => {
    const response = buildResponse();

    middleware.use(buildRequest(), response as unknown as Response, jest.fn());

    expect(response.once).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(response.once).toHaveBeenCalledTimes(1);
  });
});
