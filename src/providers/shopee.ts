import type { Product, Provider, SearchOptions, ShopeeCredentials } from '../core/types.js';
import { sha256Hex } from '../core/crypto.js';

// API Open de Afiliados da Shopee (gratuita). Credenciais em: affiliate.shopee.com.br > Open API
const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

/** Ordenação do productOfferV2: 4 = PRICE_ASC */
const SORT_PRICE_ASC = 4;

interface ShopeeNode {
  itemId: number;
  productName: string;
  priceMin: string;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  shopName: string;
  ratingStar: string;
  sales: number;
}

export async function shopeeRequest<T>(
  creds: ShopeeCredentials,
  query: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const payload = JSON.stringify({ query });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha256Hex(`${creds.appId}${timestamp}${payload}${creds.secret}`);
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${creds.appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
  });
  if (!res.ok) throw new Error(`Shopee HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopee: ${json.errors[0].message}`);
  return json.data as T;
}

export class ShopeeProvider implements Provider {
  name = 'shopee';

  constructor(private creds: ShopeeCredentials, private fetchImpl: typeof fetch = fetch) {}

  async search({ query, limit, signal }: SearchOptions): Promise<Product[]> {
    // Duas ordenações: a por preço sozinha traz muito acessório barato; relevância equilibra.
    const gql = (sort: number) => `{
      productOfferV2(keyword: ${JSON.stringify(query)}, sortType: ${sort}, page: 1, limit: ${limit}) {
        nodes { itemId productName priceMin imageUrl productLink offerLink shopName ratingStar sales }
      }
    }`;
    const [byPrice, byRelevance] = await Promise.all(
      [SORT_PRICE_ASC, 1].map((s) =>
        shopeeRequest<{ productOfferV2: { nodes: ShopeeNode[] } }>(this.creds, gql(s), signal, this.fetchImpl),
      ),
    );
    return [...byPrice.productOfferV2.nodes, ...byRelevance.productOfferV2.nodes].map((n) => ({
      id: `shopee:${n.itemId}`,
      title: n.productName,
      price: Number(n.priceMin),
      currency: 'BRL',
      url: n.productLink,
      affiliateUrl: n.offerLink,
      imageUrl: n.imageUrl,
      store: n.shopName ? `Shopee · ${n.shopName}` : 'Shopee',
      marketplace: 'shopee',
      rating: Number(n.ratingStar) || undefined,
      sales: n.sales,
    }));
  }
}

/** Gera link curto de afiliado para qualquer URL da Shopee. subIds aparecem no relatório de conversões. */
export async function shopeeShortLink(
  creds: ShopeeCredentials,
  originUrl: string,
  subIds: string[] = [],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const ids = subIds.slice(0, 5).map((s) => JSON.stringify(s.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50)));
  const gql = `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(originUrl)}, subIds: [${ids.join(',')}] }) { shortLink } }`;
  const data = await shopeeRequest<{ generateShortLink: { shortLink: string } }>(creds, gql, undefined, fetchImpl);
  return data.generateShortLink.shortLink;
}
