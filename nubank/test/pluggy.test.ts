import { describe, expect, it } from 'vitest';
import { PluggyClient } from '../src/pluggy.js';

function fakeFetch(routes: (url: URL, init?: RequestInit) => unknown) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const fn = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const body = routes(url, init);
    if (body instanceof Response) return body;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { fn, calls };
}

const creds = { clientId: 'id', clientSecret: 'secret' };

describe('PluggyClient', () => {
  it('autentica uma vez e envia X-API-KEY', async () => {
    const { fn, calls } = fakeFetch((url) => (url.pathname === '/auth' ? { apiKey: 'K' } : { results: [] }));
    const c = new PluggyClient(creds, fn);
    await c.listAccounts('item1');
    await c.listAccounts('item1');
    expect(calls.filter((x) => x.url.pathname === '/auth')).toHaveLength(1);
    const acc = calls.find((x) => x.url.pathname === '/accounts')!;
    expect(acc.url.searchParams.get('itemId')).toBe('item1');
    expect((acc.init?.headers as Record<string, string>)['X-API-KEY']).toBe('K');
  });

  it('segue o cursor de /v2/transactions até next = null', async () => {
    const { fn, calls } = fakeFetch((url) => {
      if (url.pathname === '/auth') return { apiKey: 'K' };
      const after = url.searchParams.get('after');
      if (!after) return { results: [{ id: '1' }], next: '?accountId=a&after=c%2B2' };
      if (after === 'c+2') return { results: [{ id: '2' }], next: null };
      throw new Error(`cursor inesperado ${after}`);
    });
    const txs = await new PluggyClient(creds, fn).listTransactions('a', '2026-10-01', '2026-11-01');
    expect(txs.map((t) => t.id)).toEqual(['1', '2']);
    const first = calls.find((x) => x.url.pathname === '/v2/transactions')!;
    expect(first.url.searchParams.get('dateFrom')).toBe('2026-10-01');
    expect(first.url.searchParams.get('dateTo')).toBe('2026-11-01');
  });

  it('pagina /bills por número de página', async () => {
    const { fn } = fakeFetch((url) => {
      if (url.pathname === '/auth') return { apiKey: 'K' };
      const page = Number(url.searchParams.get('page'));
      return { results: [{ id: `b${page}` }], totalPages: 2, page };
    });
    const bills = await new PluggyClient(creds, fn).listBills('a');
    expect(bills.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('dá erro claro quando as credenciais estão erradas', async () => {
    const { fn } = fakeFetch(() => new Response('nope', { status: 401 }));
    await expect(new PluggyClient(creds, fn).listAccounts('i')).rejects.toThrow(/PLUGGY_CLIENT_ID/);
  });
});
