import { describe, expect, it } from 'vitest';
import { rank, searchAll } from '../src/core/search.js';
import { relevance } from '../src/core/similarity.js';
import type { Product, Provider } from '../src/core/types.js';

const p = (title: string, price: number, extra: Partial<Product> = {}): Product => ({
  id: title, title, price, currency: 'BRL', url: `https://x.com/${encodeURIComponent(title)}`,
  store: 'X', marketplace: 'shopee', ...extra,
});

describe('relevance', () => {
  it('ignora acento, caixa, stopwords e plural', () => {
    expect(relevance('Mesas de INÓX', 'mesa inox 1,20m')).toBe(1);
    expect(relevance('mesa inox', 'Cadeira de inox')).toBe(0.5);
  });
});

describe('rank', () => {
  it('ordena por preço, remove irrelevantes, outliers e duplicados, respeita o limite', () => {
    const list = [
      p('Mesa Inox 1,90m', 700), p('Mesa Inox 1,20m', 450), p('Mesa inox bancada', 500),
      p('Mesa Inox 1,20m', 450), // duplicado
      p('Pé para mesa inox', 20), // acessório barato (outlier)
      p('Cadeira gamer', 300), // irrelevante
      p('Mesa inox gourmet', 400), p('Mesa inox dobrável', 380),
    ];
    const out = rank('mesa inox', list, { limit: 3, minRelevance: 0.6, minPriceRatio: 0.25 });
    expect(out.map((x) => x.price)).toEqual([380, 400, 450]);
  });
});

describe('searchAll', () => {
  it('um provedor com erro não derruba os outros', async () => {
    const ok: Provider = { name: 'ok', search: async () => [p('Mesa inox', 100)] };
    const bad: Provider = { name: 'bad', search: async () => { throw new Error('fora do ar'); } };
    const r = await searchAll([ok, bad], 'mesa inox');
    expect(r.products).toHaveLength(1);
    expect(r.errors).toEqual([{ provider: 'bad', message: 'fora do ar' }]);
  });
});
