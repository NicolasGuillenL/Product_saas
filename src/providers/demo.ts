import type { Product, Provider, SearchOptions } from '../core/types.js';
import { relevance } from '../core/similarity.js';

// Catálogo fixo para testar o fluxo inteiro sem nenhuma credencial.
const CATALOG: Omit<Product, 'id' | 'currency'>[] = [
  { title: 'Mesa Inox 1,90 x 0,70 com Prateleira Lisa', price: 689.9, url: 'https://shopee.com.br/product/1/101', store: 'Shopee · InoxBrasil', marketplace: 'shopee' },
  { title: 'Mesa de Inox Industrial 1,20m Bancada', price: 459.0, url: 'https://shopee.com.br/product/1/102', store: 'Shopee · CozinhaPro', marketplace: 'shopee' },
  { title: 'Mesa Bancada Aço Inox 430 1,50m', price: 529.9, url: 'https://www.mercadolivre.com.br/p/MLB103', store: 'Mercado Livre', marketplace: 'mercadolivre' },
  { title: 'Mesa Inox Profissional 2,00 x 0,70m', price: 899.0, url: 'https://www.amazon.com.br/dp/B0DEMO104', store: 'Amazon', marketplace: 'amazon' },
  { title: 'Mesa Inox Dobrável Camping', price: 349.9, url: 'https://www.magazineluiza.com.br/p/105', store: 'Magalu', marketplace: 'magalu' },
  { title: 'Pé Regulável para Mesa Inox (unidade)', price: 19.9, url: 'https://shopee.com.br/product/1/106', store: 'Shopee · Peças', marketplace: 'shopee' },
  { title: 'Mesa Inox Gourmet 1,00m', price: 399.0, url: 'https://shopee.com.br/product/1/107', store: 'Shopee · Gourmet', marketplace: 'shopee' },
  { title: 'Cadeira de Escritório Ergonômica', price: 499.0, url: 'https://shopee.com.br/product/1/108', store: 'Shopee', marketplace: 'shopee' },
];

export class DemoProvider implements Provider {
  name = 'demo';

  async search({ query }: SearchOptions): Promise<Product[]> {
    return CATALOG.filter((p) => relevance(query, p.title) > 0).map((p, i) => ({
      ...p, id: `demo:${i}`, currency: 'BRL',
      imageUrl: `https://placehold.co/300x300/eee/333?text=${encodeURIComponent(p.store.split(' ')[0])}`,
    }));
  }
}
