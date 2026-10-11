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
  { title: 'Cadeira Gamer Reclinável com Almofadas', price: 689.0, url: 'https://shopee.com.br/product/1/109', store: 'Shopee · GameStore', marketplace: 'shopee' },
  { title: 'Cadeira Gamer Preta e Vermelha', price: 759.9, url: 'https://www.mercadolivre.com.br/p/MLB110', store: 'Mercado Livre', marketplace: 'mercadolivre' },
  { title: 'Fone de Ouvido Bluetooth TWS', price: 59.9, url: 'https://shopee.com.br/product/1/111', store: 'Shopee · AudioMix', marketplace: 'shopee' },
  { title: 'Fone Bluetooth com Cancelamento de Ruído', price: 189.0, url: 'https://www.amazon.com.br/dp/B0DEMO112', store: 'Amazon', marketplace: 'amazon' },
  { title: 'Fone Bluetooth Esportivo à Prova d’Água', price: 79.9, url: 'https://www.mercadolivre.com.br/p/MLB113', store: 'Mercado Livre', marketplace: 'mercadolivre' },
];

const COLORS: Record<string, string> = { shopee: '#ee4d2d', mercadolivre: '#ffe600', amazon: '#232f3e', magalu: '#0086ff' };

/** Imagem SVG embutida: não depende de serviço externo de placeholder. */
function demoImage(title: string, marketplace: string): string {
  const initials = title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const bg = COLORS[marketplace] ?? '#888';
  const fg = marketplace === 'mercadolivre' ? '#333' : '#fff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${bg}"/><text x="60" y="72" font-family="sans-serif" font-size="40" font-weight="700" fill="${fg}" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export class DemoProvider implements Provider {
  name = 'demo';

  async search({ query }: SearchOptions): Promise<Product[]> {
    return CATALOG.filter((p) => relevance(query, p.title) > 0).map((p, i) => ({
      ...p, id: `demo:${i}`, currency: 'BRL',
      imageUrl: demoImage(p.title, p.marketplace),
    }));
  }
}
