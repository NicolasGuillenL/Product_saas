export type Marketplace = 'shopee' | 'mercadolivre' | 'amazon' | 'magalu' | 'aliexpress' | 'outro';

/** Produto normalizado, independente da loja de origem. */
export interface Product {
  id: string;
  title: string;
  price: number;
  currency: 'BRL';
  url: string;
  imageUrl?: string;
  store: string;
  marketplace: Marketplace;
  rating?: number;
  sales?: number;
  /** Link de afiliado já pronto vindo da fonte (ex.: offerLink da Shopee). Nunca vai pro navegador. */
  affiliateUrl?: string;
}

export interface SearchOptions {
  query: string;
  limit: number;
  signal?: AbortSignal;
}

export interface Provider {
  name: string;
  search(opts: SearchOptions): Promise<Product[]>;
}

export interface ShopeeCredentials {
  appId: string;
  secret: string;
}

export interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  /** Origens autorizadas a usar o widget (CORS). Vazio = qualquer uma. */
  allowedOrigins: string[];
  affiliate: {
    shopee?: ShopeeCredentials;
    /** Tag de associado Amazon, ex.: "meusite-20". */
    amazonTag?: string;
    /** Deeplink genérico por loja (Lomadee, Awin...). Use {url} como placeholder. */
    templates?: Partial<Record<Marketplace, string>>;
  };
}
