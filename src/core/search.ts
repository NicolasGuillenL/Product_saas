import type { Product, Provider } from './types.js';
import { normalize, relevance } from './similarity.js';

export interface RankOptions {
  limit: number;
  /** Relevância mínima (0..1). 1 = todos os termos precisam aparecer ("igual"). */
  minRelevance: number;
  /** Descarta itens abaixo desta fração da mediana de preço (acessórios/peças avulsas). */
  minPriceRatio: number;
}

export const DEFAULT_RANK: RankOptions = { limit: 10, minRelevance: 0.6, minPriceRatio: 0.25 };

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Filtra por similaridade, remove duplicados e outliers e ordena do mais barato pro mais caro. */
export function rank(query: string, products: Product[], opts: RankOptions = DEFAULT_RANK): Product[] {
  const relevant = products.filter(
    (p) => Number.isFinite(p.price) && p.price > 0 && relevance(query, p.title) >= opts.minRelevance,
  );

  const seen = new Set<string>();
  const unique = relevant.filter((p) => {
    const key = `${p.marketplace}|${normalize(p.title)}|${p.price.toFixed(2)}`;
    if (seen.has(key) || seen.has(p.url)) return false;
    seen.add(key);
    seen.add(p.url);
    return true;
  });

  let filtered = unique;
  if (unique.length >= 5 && opts.minPriceRatio > 0) {
    const floor = median(unique.map((p) => p.price)) * opts.minPriceRatio;
    filtered = unique.filter((p) => p.price >= floor);
  }

  return filtered.sort((a, b) => a.price - b.price).slice(0, opts.limit);
}

export interface SearchResult {
  products: Product[];
  errors: { provider: string; message: string }[];
}

/** Consulta todos os provedores em paralelo; a falha de um não derruba a busca. */
export async function searchAll(
  providers: Provider[],
  query: string,
  rankOpts: RankOptions = DEFAULT_RANK,
  timeoutMs = 8000,
): Promise<SearchResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  const settled = await Promise.allSettled(
    providers.map((p) => p.search({ query, limit: 40, signal })),
  );
  const all: Product[] = [];
  const errors: SearchResult['errors'] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value);
    else errors.push({ provider: providers[i].name, message: String(r.reason?.message ?? r.reason) });
  });
  return { products: rank(query, all, rankOpts), errors };
}
