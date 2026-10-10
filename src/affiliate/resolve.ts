import type { Marketplace, Tenant } from '../core/types.js';
import { shopeeShortLink } from '../providers/shopee.js';

/** O que vai dentro do token assinado do link /go. */
export interface LinkPayload {
  /** id do tenant (site cliente) */
  t: string;
  /** URL original do produto */
  u: string;
  m: Marketplace;
  /** link de afiliado já pronto da fonte, se houver */
  a?: string;
}

export type AffiliateConfig = Tenant['affiliate'];

/**
 * Decide para onde o clique vai. Ordem: afiliação do tenant -> afiliação da plataforma
 * (fallback opcional, a comissão fica com o dono do SaaS) -> link original.
 */
export async function resolveAffiliateUrl(
  payload: LinkPayload,
  tenant: AffiliateConfig,
  platform: AffiliateConfig = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; affiliated: boolean }> {
  const { u, m, a, t } = payload;

  if (a) return { url: a, affiliated: true };

  if (m === 'shopee') {
    const creds = tenant.shopee ?? platform.shopee;
    if (creds) {
      try {
        return { url: await shopeeShortLink(creds, u, [t], fetchImpl), affiliated: true };
      } catch {
        // API fora do ar não pode quebrar o clique: segue para o link original.
      }
    }
  }

  if (m === 'amazon') {
    const tag = tenant.amazonTag ?? platform.amazonTag;
    if (tag) {
      const url = new URL(u);
      url.searchParams.set('tag', tag);
      return { url: url.toString(), affiliated: true };
    }
  }

  const template = tenant.templates?.[m] ?? platform.templates?.[m];
  if (template) return { url: template.replace('{url}', encodeURIComponent(u)), affiliated: true };

  return { url: u, affiliated: false };
}
