import { CsrfMiddleware } from './csrf.middleware';

const mockConfigService = {
  get: jest.fn(),
};

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new CsrfMiddleware(mockConfigService as any);
  });

  it('appelle next() sans poser de cookie si le header XSRF-TOKEN est déjà présent', () => {
    const req = { headers: { 'XSRF-TOKEN': 'existing-token' } } as any;
    const res = { cookie: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('génère un token et pose le cookie en mode développement', () => {
    mockConfigService.get.mockReturnValue('development');
    const req = { headers: {} } as any;
    const res = { cookie: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, secure: false, sameSite: 'lax' }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('pose le cookie avec le domaine et secure:true en mode production', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'COOKIE_DOMAIN') return '.example.com';
    });
    const req = { headers: {} } as any;
    const res = { cookie: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ secure: true, domain: '.example.com' }),
    );
    expect(next).toHaveBeenCalled();
  });
});
