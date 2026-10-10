import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp({
  tenants: [{ id: 'loja1', name: 'Loja 1', apiKey: 'k1', allowedOrigins: ['https://loja1.com'], affiliate: { amazonTag: 'loja1-20' } }],
  linkSecret: 'segredo',
  publicUrl: 'https://api.test',
  demo: true,
});

describe('API', () => {
  it('exige api key', async () => {
    expect((await app.request('/api/search?q=mesa')).status).toBe(401);
  });

  it('retorna os mais baratos com link /go e sem expor link de afiliado', async () => {
    const res = await app.request('/api/search?key=k1&q=mesa%20inox&limit=5');
    const body = await res.json();
    expect(body.count).toBe(5);
    const prices = body.products.map((p: any) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBeGreaterThan(100); // pé de mesa de R$19,90 foi descartado
    expect(body.products[0].link).toMatch(/^https:\/\/api\.test\/go\?t=/);
    expect(body.products[0]).not.toHaveProperty('affiliateUrl');
  });

  it('CORS só libera origens cadastradas do tenant', async () => {
    const ok = await app.request('/api/search?key=k1&q=mesa', { headers: { Origin: 'https://loja1.com' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://loja1.com');
    const bad = await app.request('/api/search?key=k1&q=mesa', { headers: { Origin: 'https://outro.com' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('/go redireciona com afiliação e rejeita token adulterado', async () => {
    const body = await (await app.request('/api/search?key=k1&q=mesa%20inox%20profissional&mode=exact')).json();
    const amazon = body.products.find((p: any) => p.marketplace === 'amazon');
    const go = await app.request(amazon.link.replace('https://api.test', ''));
    expect(go.status).toBe(302);
    expect(go.headers.get('location')).toContain('tag=loja1-20');
    expect((await app.request('/go?t=abc.def')).status).toBe(400);
  });
});
