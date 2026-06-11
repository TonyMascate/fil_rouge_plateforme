import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

const buildHost = () => {
  const jsonFn = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  const response = { status: statusFn };
  return {
    switchToHttp: () => ({ getResponse: () => response }),
    _response: response,
    _json: jsonFn,
    _status: statusFn,
  };
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('formate une HttpException correctement', () => {
      const host = buildHost();
      const exception = new HttpException({ code: 'AUTH_ERROR', message: 'Non autorisé', details: [] }, HttpStatus.UNAUTHORIZED);

      filter.catch(exception, host as any);

      expect(host._status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(host._json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Non autorisé',
      }));
    });

    it('retourne une réponse 500 pour une erreur inconnue', () => {
      const host = buildHost();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      filter.catch(new Error('Crash imprévu'), host as any);

      expect(host._status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host._json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }));
      consoleSpy.mockRestore();
    });

    it('formate une HttpException sans objet structuré', () => {
      const host = buildHost();
      const exception = new HttpException('Accès refusé', HttpStatus.FORBIDDEN);

      filter.catch(exception, host as any);

      expect(host._status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });
  });
});
