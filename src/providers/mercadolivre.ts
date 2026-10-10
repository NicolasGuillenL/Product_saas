import type { Product, Provider, SearchOptions } from '../core/types.js';

// API pública do Mercado Livre. Desde 2025 a busca pode exigir access token de um app
// cadastrado em developers.mercadolivre.com.br (gratuito).
export class MercadoLivreProvider implements Provider {
  name = 'mercadolivre';

  constructor(private accessToken?: string, private fetchImpl: typeof fetch = fetch) {}

  async search({ query, limit, signal }: SearchOptions): Promise<Product[]> {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`;
    const res = await this.fetchImpl(url, {
      signal,
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {},
    });
    if (!res.ok) throw new Error(`Mercado Livre HTTP ${res.status}`);
    const json = (await res.json()) as {
      results: { id: string; title: string; price: number; permalink: string; thumbnail: string; seller?: { nickname?: string } }[];
    };
    return json.results.map((r) => ({
      id: `ml:${r.id}`,
      title: r.title,
      price: r.price,
      currency: 'BRL',
      url: r.permalink,
      imageUrl: r.thumbnail?.replace(/^http:/, 'https:'),
      store: 'Mercado Livre',
      marketplace: 'mercadolivre',
    }));
  }
}
