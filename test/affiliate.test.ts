import { describe, expect, it, vi } from 'vitest';
import { resolveAffiliateUrl } from '../src/affiliate/resolve.js';
import { signToken, verifyToken, sha256Hex } from '../src/core/crypto.js';

const shopeeFetch = (shortLink: string) =>
  vi.fn(async (_url: unknown, init?: RequestInit) => {
    const auth = (init!.headers as Record<string, string>).Authorization;
    expect(auth).toMatch(/^SHA256 Credential=app1, Timestamp=\d+, Signature=[0-9a-f]{64}$/);
    return new Response(JSON.stringify({ data: { generateShortLink: { shortLink } } }));
  }) as unknown as typeof fetch;

describe('resolveAffiliateUrl', () => {
  const shopeeUrl = 'https://shopee.com.br/product/1/2';

  it('usa o link pronto da fonte quando existe', async () => {
    const r = await resolveAffiliateUrl({ t: 'a', u: shopeeUrl, m: 'shopee', a: 'https://s.shopee.com.br/pronto' }, {});
    expect(r).toEqual({ url: 'https://s.shopee.com.br/pronto', affiliated: true });
  });

  it('gera short link Shopee com a credencial do tenant', async () => {
    const f = shopeeFetch('https://s.shopee.com.br/abc');
    const r = await resolveAffiliateUrl({ t: 'loja1', u: shopeeUrl, m: 'shopee' }, { shopee: { appId: 'app1', secret: 's' } }, {}, f);
    expect(r).toEqual({ url: 'https://s.shopee.com.br/abc', affiliated: true });
    expect(String((f as any).mock.calls[0][1].body)).toContain('loja1');
  });

  it('cai no link original se a Shopee falhar', async () => {
    const f = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    const r = await resolveAffiliateUrl({ t: 'x', u: shopeeUrl, m: 'shopee' }, { shopee: { appId: 'app1', secret: 's' } }, {}, f);
    expect(r).toEqual({ url: shopeeUrl, affiliated: false });
  });

  it('aplica tag Amazon e template genérico; sem afiliação devolve o original', async () => {
    const amz = await resolveAffiliateUrl({ t: 'x', u: 'https://www.amazon.com.br/dp/B01?th=1', m: 'amazon' }, {}, { amazonTag: 'plat-20' });
    expect(amz.url).toBe('https://www.amazon.com.br/dp/B01?th=1&tag=plat-20');
    const ml = await resolveAffiliateUrl({ t: 'x', u: 'https://mercadolivre.com.br/p/1', m: 'mercadolivre' }, { templates: { mercadolivre: 'https://aff.io/?u={url}' } });
    expect(ml.url).toBe('https://aff.io/?u=https%3A%2F%2Fmercadolivre.com.br%2Fp%2F1');
    const none = await resolveAffiliateUrl({ t: 'x', u: 'https://magalu.com/p', m: 'magalu' }, {});
    expect(none).toEqual({ url: 'https://magalu.com/p', affiliated: false });
  });
});

describe('crypto', () => {
  it('token assinado não pode ser adulterado', async () => {
    const tok = await signToken({ u: 'https://shopee.com.br' }, 'k');
    expect(await verifyToken(tok, 'k')).toEqual({ u: 'https://shopee.com.br' });
    expect(await verifyToken(tok, 'outra')).toBeNull();
    expect(await verifyToken(tok.replace(/^./, 'A'), 'k')).toBeNull();
  });

  it('sha256Hex bate com o valor conhecido', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
