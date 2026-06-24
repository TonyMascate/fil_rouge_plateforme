// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

// jwtVerify est mocké : on contrôle "token valide" (resolve) vs "expiré" (reject)
// sans avoir besoin d'un vrai JWT signé.
vi.mock("jose", () => ({ jwtVerify: vi.fn() }));
import { jwtVerify } from "jose";

const mockedJwtVerify = vi.mocked(jwtVerify);

function buildRequest(path: string, options: { cookies?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const request = new NextRequest(`http://localhost:3000${path}`, { headers: options.headers });
  for (const [name, value] of Object.entries(options.cookies ?? {})) {
    request.cookies.set(name, value);
  }
  return request;
}

function buildRefreshResponse(ok: boolean) {
  const response = new Response(ok ? JSON.stringify({ message: "Refreshed" }) : "Unauthorized", {
    status: ok ? 200 : 401,
  });
  if (ok) {
    response.headers.append("set-cookie", "access_token=NEW_ACCESS; Path=/; HttpOnly");
    response.headers.append("set-cookie", "refresh_token=NEW_REFRESH; Path=/; HttpOnly");
  }
  return response;
}

function isRedirectTo(response: Response, path: string) {
  return (response.status === 307 || response.status === 308) && (response.headers.get("location") ?? "").includes(path);
}

function isNext(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

beforeEach(() => {
  vi.stubEnv("JWT_ACCESS_SECRET", "test-secret");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  mockedJwtVerify.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("proxy (middleware)", () => {
  it("laisse passer une route publique sans tokens", async () => {
    const response = await proxy(buildRequest("/"));
    expect(isNext(response)).toBe(true);
  });

  it("redirige vers /login une route protégée sans session", async () => {
    const response = await proxy(buildRequest("/galerie"));
    expect(isRedirectTo(response, "/login")).toBe(true);
  });

  it("laisse passer une route protégée avec un access_token valide", async () => {
    mockedJwtVerify.mockResolvedValue({} as never);
    const response = await proxy(buildRequest("/galerie", { cookies: { access_token: "valid" } }));
    expect(isNext(response)).toBe(true);
  });

  it("redirige /login vers /galerie quand l'access_token est valide", async () => {
    mockedJwtVerify.mockResolvedValue({} as never);
    const response = await proxy(buildRequest("/login", { cookies: { access_token: "valid" } }));
    expect(isRedirectTo(response, "/galerie")).toBe(true);
  });

  it("rafraîchit le token expiré et laisse passer (route protégée)", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));
    vi.mocked(fetch).mockResolvedValue(buildRefreshResponse(true));

    const response = await proxy(buildRequest("/galerie", { cookies: { access_token: "expired", refresh_token: "valid" } }));

    expect(fetch).toHaveBeenCalledOnce();
    expect(isNext(response)).toBe(true);
    // Les nouveaux cookies sont renvoyés au navigateur.
    expect(response.headers.getSetCookie().join(";")).toContain("access_token=NEW_ACCESS");
  });

  it("rafraîchit le token expiré et redirige /login vers /galerie", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));
    vi.mocked(fetch).mockResolvedValue(buildRefreshResponse(true));

    const response = await proxy(buildRequest("/login", { cookies: { access_token: "expired", refresh_token: "valid" } }));

    expect(isRedirectTo(response, "/galerie")).toBe(true);
  });

  it("redirige vers /login quand le refresh échoue", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));
    vi.mocked(fetch).mockResolvedValue(buildRefreshResponse(false));

    const response = await proxy(buildRequest("/galerie", { cookies: { access_token: "expired", refresh_token: "dead" } }));

    expect(isRedirectTo(response, "/login")).toBe(true);
  });

  it("ne rafraîchit JAMAIS sur un prefetch (et laisse passer)", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));

    const response = await proxy(
      buildRequest("/galerie", {
        cookies: { access_token: "expired", refresh_token: "valid" },
        headers: { "next-router-prefetch": "1" },
      }),
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(isNext(response)).toBe(true);
  });

  it("traite aussi l'en-tête purpose=prefetch", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));

    const response = await proxy(
      buildRequest("/galerie", {
        cookies: { access_token: "expired", refresh_token: "valid" },
        headers: { purpose: "prefetch" },
      }),
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(isNext(response)).toBe(true);
  });

  it("redirige vers /login si le fetch de refresh jette une exception", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const response = await proxy(buildRequest("/galerie", { cookies: { access_token: "expired", refresh_token: "valid" } }));

    expect(isRedirectTo(response, "/login")).toBe(true);
  });
});
