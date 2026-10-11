import type { Product, Provider, SearchOptions } from '../core/types.js';

export interface MercadoLivreAuth {
  /** App criado em developers.mercadolivre.com.br (gratuito). O token é gerado e renovado sozinho. */
  clientId?: string;
  clientSecret?: string;
  /** Alternativa: token fixo (expira em 6h). */
  accessToken?: string;
}

// API do Mercado Livre. Desde 2025 a busca sem token responde 403.
export class MercadoLivreProvider implements Provider {
  name = 'mercadolivre';
  private token?: { value: string; expires: number };

  constructor(private auth: MercadoLivreAuth = {}, private fetchImpl: typeof fetch = fetch) {}

  private async accessToken(signal?: AbortSignal): Promise<string | undefined> {
    if (this.auth.accessToken) return this.auth.accessToken;
    if (!this.auth.clientId || !this.auth.clientSecret) return undefined;
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const res = await this.fetchImpl('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.auth.clientId, client_secret: this.auth.clientSecret }),
    });
    if (!res.ok) throw new Error(`Mercado Livre: falha ao obter token (HTTP ${res.status})`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expires: Date.now() + (json.expires_in - 300) * 1000 };
    return this.token.value;
  }

  async search({ query, limit, signal }: SearchOptions): Promise<Product[]> {
    const token = await this.accessToken(signal);
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`;
    const res = await this.fetchImpl(url, {
      signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 403) {
      throw new Error('Mercado Livre HTTP 403: a busca exige credenciais de um app autorizado (MERCADOLIVRE_CLIENT_ID/SECRET)');
    }
    if (!res.ok) throw new Error(`Mercado Livre HTTP ${res.status}`);
    const json = (await res.json()) as {
      results: { id: string; title: string; price: number; permalink: string; thumbnail: string }[];
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
