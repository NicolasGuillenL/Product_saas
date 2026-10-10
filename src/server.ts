import { readFileSync, existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.js';
import type { Tenant } from './core/types.js';

const env = process.env;

function loadTenants(): Tenant[] {
  if (env.TENANTS_JSON) return JSON.parse(env.TENANTS_JSON);
  if (existsSync('tenants.json')) return JSON.parse(readFileSync('tenants.json', 'utf8'));
  console.warn('Sem tenants.json: usando tenant de demonstração (key "demo-key").');
  return [{ id: 'demo', name: 'Demo', apiKey: 'demo-key', allowedOrigins: [], affiliate: {} }];
}

const port = Number(env.PORT) || 3000;
const tenants = loadTenants();
const hasShopee = Boolean(env.SHOPEE_APP_ID) || tenants.some((t) => t.affiliate.shopee);

if (!env.LINK_SECRET) console.warn('LINK_SECRET não definido: usando segredo de desenvolvimento.');

const app = createApp({
  tenants,
  linkSecret: env.LINK_SECRET ?? 'dev-secret-troque-em-producao',
  publicUrl: env.PUBLIC_URL ?? `http://localhost:${port}`,
  platform: {
    shopee: env.SHOPEE_APP_ID && env.SHOPEE_SECRET ? { appId: env.SHOPEE_APP_ID, secret: env.SHOPEE_SECRET } : undefined,
    amazonTag: env.AMAZON_TAG,
  },
  mercadoLivre: env.MERCADOLIVRE_ENABLED === 'true' ? { accessToken: env.MERCADOLIVRE_TOKEN } : undefined,
  serpApiKey: env.SERPAPI_KEY,
  demo: env.DEMO === 'true' || (!hasShopee && env.MERCADOLIVRE_ENABLED !== 'true' && !env.SERPAPI_KEY),
  onClick: (e) => console.log(JSON.stringify({ type: 'click', ...e })),
});

app.use('/*', serveStatic({ root: './public' }));

serve({ fetch: app.fetch, port }, () => console.log(`Rodando em http://localhost:${port} (demo: http://localhost:${port}/demo.html)`));
