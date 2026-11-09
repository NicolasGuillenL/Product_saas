import type { Account, Bill, Item, Transaction } from './types.js';

const BASE_URL = 'https://api.pluggy.ai';

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

/** Cliente mínimo da API Pluggy (sem dependências: usa o fetch nativo do Node). */
export class PluggyClient {
  private apiKey: string | null = null;

  constructor(
    private readonly creds: PluggyCredentials,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async auth(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    const res = await this.fetchFn(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.creds),
    });
    if (!res.ok) {
      throw new Error(`Falha ao autenticar na Pluggy (HTTP ${res.status}). Confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.`);
    }
    const { apiKey } = (await res.json()) as { apiKey: string };
    this.apiKey = apiKey;
    return apiKey;
  }

  private async get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    const apiKey = await this.auth();
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v);
    const query = qs.toString();
    const res = await this.fetchFn(`${BASE_URL}${path}${query ? `?${query}` : ''}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Pluggy GET ${path} → HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  getItem(itemId: string): Promise<Item> {
    return this.get<Item>(`/items/${itemId}`);
  }

  async listAccounts(itemId: string): Promise<Account[]> {
    const { results } = await this.get<{ results: Account[] }>('/accounts', { itemId });
    return results;
  }

  /** Todas as transações do período, seguindo o cursor de /v2/transactions. */
  async listTransactions(accountId: string, dateFrom: string, dateTo: string): Promise<Transaction[]> {
    const all: Transaction[] = [];
    let after: string | undefined;
    do {
      const page = await this.get<{ results: Transaction[]; next: string | null }>('/v2/transactions', {
        accountId,
        dateFrom,
        dateTo,
        after,
      });
      all.push(...page.results);
      after = page.next ? new URLSearchParams(page.next.replace(/^\?/, '')).get('after') ?? undefined : undefined;
    } while (after);
    return all;
  }

  async listBills(accountId: string): Promise<Bill[]> {
    const all: Bill[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await this.get<{ results: Bill[]; totalPages: number }>('/bills', {
        accountId,
        page: String(page),
      });
      all.push(...res.results);
      totalPages = res.totalPages ?? 1;
      page++;
    } while (page <= totalPages);
    return all;
  }
}
