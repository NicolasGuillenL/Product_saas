import type { Marketplace, Product, Provider, SearchOptions } from '../core/types.js';

// Google Shopping via SerpAPI: cobre Amazon, Magalu, Americanas etc. Plano gratuito tem cota
// mensal pequena, por isso o cache é importante. Opcional.
export function marketplaceFromUrl(url: string): Marketplace {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (/shopee\./.test(host)) return 'shopee';
  if (/mercadoli(vre|bre)\./.test(host)) return 'mercadolivre';
  if (/amazon\./.test(host)) return 'amazon';
  if (/magazineluiza|magalu/.test(host)) return 'magalu';
  if (/aliexpress\./.test(host)) return 'aliexpress';
  return 'outro';
}

export class SerpApiProvider implements Provider {
  name = 'google-shopping';

  constructor(private apiKey: string, private fetchImpl: typeof fetch = fetch) {}

  async search({ query, signal }: SearchOptions): Promise<Product[]> {
    const params = new URLSearchParams({
      engine: 'google_shopping', q: query, gl: 'br', hl: 'pt-br', api_key: this.apiKey,
    });
    const res = await this.fetchImpl(`https://serpapi.com/search.json?${params}`, { signal });
    if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
    const json = (await res.json()) as {
      shopping_results?: { product_id?: string; title: string; extracted_price?: number; product_link?: string; link?: string; thumbnail?: string; source?: string; rating?: number }[];
    };
    return (json.shopping_results ?? [])
      .filter((r) => r.extracted_price && (r.link || r.product_link))
      .map((r, i) => {
        const url = (r.link || r.product_link)!;
        return {
          id: `gs:${r.product_id ?? i}`,
          title: r.title,
          price: r.extracted_price!,
          currency: 'BRL' as const,
          url,
          imageUrl: r.thumbnail,
          store: r.source ?? 'Google Shopping',
          marketplace: marketplaceFromUrl(url),
          rating: r.rating,
        };
      });
  }
}
