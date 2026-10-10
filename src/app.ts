import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Provider, Tenant } from './core/types.js';
import { DEFAULT_RANK, searchAll, type SearchResult } from './core/search.js';
import { TtlCache } from './core/cache.js';
import { signToken, verifyToken } from './core/crypto.js';
import { normalize } from './core/similarity.js';
import { resolveAffiliateUrl, type AffiliateConfig, type LinkPayload } from './affiliate/resolve.js';
import { ShopeeProvider } from './providers/shopee.js';
import { MercadoLivreProvider } from './providers/mercadolivre.js';
import { SerpApiProvider } from './providers/serpapi.js';
import { DemoProvider } from './providers/demo.js';

export interface AppConfig {
  tenants: Tenant[];
  /** Segredo para assinar os links /go. */
  linkSecret: string;
  /** URL pública desta API, usada para montar os links /go. */
  publicUrl: string;
  /** Afiliação do dono do SaaS, usada quando o tenant não tem a própria. */
  platform?: AffiliateConfig;
  /** Liga o Mercado Livre. O token é opcional, mas a busca pública pode exigir um. */
  mercadoLivre?: { accessToken?: string };
  serpApiKey?: string;
  /** Liga o catálogo de demonstração (útil sem credenciais). */
  demo?: boolean;
  fetchImpl?: typeof fetch;
  onClick?: (event: { tenant: string; marketplace: string; affiliated: boolean; at: string }) => void;
}

export function createApp(config: AppConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const byKey = new Map(config.tenants.map((t) => [t.apiKey, t]));
  const byId = new Map(config.tenants.map((t) => [t.id, t]));
  const cache = new TtlCache<SearchResult>(60 * 60 * 1000);

  function providersFor(tenant: Tenant): { list: Provider[]; cacheKey: string } {
    const list: Provider[] = [];
    const shopee = tenant.affiliate.shopee ?? config.platform?.shopee;
    if (shopee) list.push(new ShopeeProvider(shopee, fetchImpl));
    if (config.mercadoLivre) list.push(new MercadoLivreProvider(config.mercadoLivre.accessToken, fetchImpl));
    if (config.serpApiKey) list.push(new SerpApiProvider(config.serpApiKey, fetchImpl));
    if (config.demo) list.push(new DemoProvider());
    // Os offerLinks da Shopee são da credencial usada, então o cache separa por credencial.
    return { list, cacheKey: shopee?.appId ?? '-' };
  }

  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: (origin, c) => {
        const tenant = byKey.get(c.req.query('key') ?? c.req.header('x-api-key') ?? '');
        if (!tenant) return null;
        if (tenant.allowedOrigins.length === 0) return origin || '*';
        return tenant.allowedOrigins.includes(origin) ? origin : null;
      },
      allowHeaders: ['X-Api-Key'],
    }),
  );

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/api/search', async (c) => {
    const tenant = byKey.get(c.req.query('key') ?? c.req.header('x-api-key') ?? '');
    if (!tenant) return c.json({ error: 'api key inválida' }, 401);

    const q = (c.req.query('q') ?? '').trim();
    if (q.length < 2 || q.length > 100) return c.json({ error: 'q deve ter entre 2 e 100 caracteres' }, 400);
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 10, 1), 10);
    const mode = c.req.query('mode') === 'exact' ? 'exact' : 'similar';

    const { list, cacheKey } = providersFor(tenant);
    if (list.length === 0) return c.json({ error: 'nenhuma fonte de produtos configurada' }, 503);

    const key = `${cacheKey}|${mode}|${normalize(q)}`;
    let result = cache.get(key);
    if (!result) {
      result = await searchAll(list, q, { ...DEFAULT_RANK, limit: 10, minRelevance: mode === 'exact' ? 1 : DEFAULT_RANK.minRelevance });
      if (result.products.length > 0) cache.set(key, result);
    }

    const products = await Promise.all(
      result.products.slice(0, limit).map(async ({ affiliateUrl, url, ...p }) => {
        const payload: LinkPayload = { t: tenant.id, u: url, m: p.marketplace, ...(affiliateUrl ? { a: affiliateUrl } : {}) };
        return { ...p, link: `${config.publicUrl}/go?t=${await signToken(payload, config.linkSecret)}` };
      }),
    );
    return c.json({ query: q, count: products.length, products, errors: result.errors });
  });

  app.get('/go', async (c) => {
    const payload = await verifyToken<LinkPayload>(c.req.query('t') ?? '', config.linkSecret);
    const tenant = payload && byId.get(payload.t);
    if (!payload || !tenant) return c.text('link inválido', 400);

    const { url, affiliated } = await resolveAffiliateUrl(payload, tenant.affiliate, config.platform, fetchImpl);
    config.onClick?.({ tenant: tenant.id, marketplace: payload.m, affiliated, at: new Date().toISOString() });
    return c.redirect(url, 302);
  });

  return app;
}
