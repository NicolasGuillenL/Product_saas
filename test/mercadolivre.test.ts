import { describe, expect, it, vi } from 'vitest';
import { MercadoLivreProvider } from '../src/providers/mercadolivre.js';

describe('MercadoLivreProvider', () => {
  it('obtém token via client_credentials, reaproveita e busca', async () => {
    const f = vi.fn(async (url: string) => {
      if (url.includes('/oauth/token')) return Response.json({ access_token: 'TOK', expires_in: 21600 });
      return Response.json({ results: [{ id: 'MLB1', title: 'Mesa inox', price: 300, permalink: 'https://ml.com/1', thumbnail: 'http://img/1.jpg' }] });
    });
    const ml = new MercadoLivreProvider({ clientId: 'id', clientSecret: 's' }, f as unknown as typeof fetch);
    const r = await ml.search({ query: 'mesa inox', limit: 5 });
    await ml.search({ query: 'mesa', limit: 5 });
    expect(r[0]).toMatchObject({ price: 300, imageUrl: 'https://img/1.jpg', marketplace: 'mercadolivre' });
    expect(f.mock.calls.filter(([u]) => String(u).includes('/oauth/token'))).toHaveLength(1);
    expect((f.mock.calls[1] as any)[1].headers.Authorization).toBe('Bearer TOK');
  });

  it('explica o 403 em vez de falhar calado', async () => {
    const f = (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    await expect(new MercadoLivreProvider({}, f).search({ query: 'x', limit: 1 })).rejects.toThrow(/403.*credenciais/);
  });
});
