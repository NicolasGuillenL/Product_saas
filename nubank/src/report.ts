import type { Account, Bill, Item, Transaction } from './types.js';

export type Kind = 'pix' | 'boleto' | 'outro';

const BOLETO_OPS = new Set(['BOLETO', 'CONVENIO_ARRECADACAO']);

/** Classifica uma transação da conta como Pix, boleto ou outro. */
export function classify(t: Transaction): Kind {
  const op = t.operationType?.toUpperCase();
  const method = t.paymentData?.paymentMethod?.toUpperCase();
  if (op === 'PIX' || method === 'PIX') return 'pix';
  if ((op && BOLETO_OPS.has(op)) || method === 'BOLETO' || t.paymentData?.boletoMetadata) return 'boleto';
  // Fallback pela descrição, para conexões que não preenchem operationType.
  const d = t.description.toLowerCase();
  if (/\bpix\b/.test(d)) return 'pix';
  if (/boleto|pagamento de conta|conv[eê]nio/.test(d)) return 'boleto';
  return 'outro';
}

export interface Movement {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // + entrada, - saída
  direction: 'entrada' | 'saida';
  counterpart: string | null;
  status: Transaction['status'];
}

export interface CardSummary {
  accountId: string;
  name: string;
  limit: number | null;
  available: number | null;
  openBalance: number;
  closeDate: string | null;
  dueDate: string | null;
  bills: { id: string; dueDate: string; closingDate: string | null; total: number; minimum: number | null }[];
}

export interface Report {
  generatedAt: string;
  period: { from: string; to: string };
  consentExpiresAt: string | null;
  checking: { accountId: string; name: string; balance: number }[];
  pix: Movement[];
  boletos: Movement[];
  cards: CardSummary[];
  totals: { pixIn: number; pixOut: number; boletosPaid: number };
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

function toMovement(t: Transaction): Movement {
  const out = t.type === 'DEBIT';
  const amount = out ? -Math.abs(t.amount) : Math.abs(t.amount);
  const party = out ? t.paymentData?.receiver : t.paymentData?.payer;
  return {
    id: t.id,
    date: day(t.date)!,
    description: t.description,
    amount,
    direction: out ? 'saida' : 'entrada',
    counterpart: party?.name ?? null,
    status: t.status,
  };
}

export interface ReportInput {
  item: Item | null;
  accounts: Account[];
  transactionsByAccount: Record<string, Transaction[]>;
  billsByAccount: Record<string, Bill[]>;
  from: string;
  to: string;
  now?: Date;
}

export function buildReport(input: ReportInput): Report {
  const bankAccounts = input.accounts.filter((a) => a.type === 'BANK');
  const cardAccounts = input.accounts.filter((a) => a.type === 'CREDIT' && a.subtype === 'CREDIT_CARD');

  const pix: Movement[] = [];
  const boletos: Movement[] = [];
  for (const acc of bankAccounts) {
    for (const t of input.transactionsByAccount[acc.id] ?? []) {
      const kind = classify(t);
      if (kind === 'pix') pix.push(toMovement(t));
      else if (kind === 'boleto') boletos.push(toMovement(t));
    }
  }
  const byDateDesc = (a: Movement, b: Movement) => b.date.localeCompare(a.date);
  pix.sort(byDateDesc);
  boletos.sort(byDateDesc);

  const cards: CardSummary[] = cardAccounts.map((acc) => ({
    accountId: acc.id,
    name: acc.name,
    limit: acc.creditData?.creditLimit ?? null,
    available: acc.creditData?.availableCreditLimit ?? null,
    openBalance: acc.balance,
    closeDate: day(acc.creditData?.balanceCloseDate),
    dueDate: day(acc.creditData?.balanceDueDate),
    bills: (input.billsByAccount[acc.id] ?? [])
      .map((b) => ({
        id: b.id,
        dueDate: day(b.dueDate)!,
        closingDate: day(b.billClosingDate),
        total: b.totalAmount,
        minimum: b.minimumPaymentAmount ?? null,
      }))
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
  }));

  const sum = (ms: Movement[], dir: Movement['direction']) =>
    round2(ms.filter((m) => m.direction === dir).reduce((s, m) => s + Math.abs(m.amount), 0));

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    period: { from: input.from, to: input.to },
    consentExpiresAt: input.item?.consentExpiresAt ?? null,
    checking: bankAccounts.map((a) => ({ accountId: a.id, name: a.name, balance: a.balance })),
    pix,
    boletos,
    cards,
    totals: { pixIn: sum(pix, 'entrada'), pixOut: sum(pix, 'saida'), boletosPaid: sum(boletos, 'saida') },
  };
}

// ---------- saída em texto ----------

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (n: number) => brl.format(n);
const br = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

export type Section = 'pix' | 'boleto' | 'fatura';

export function formatReport(r: Report, sections: Section[] = ['pix', 'boleto', 'fatura'], now = new Date()): string {
  const lines: string[] = [];
  lines.push(`Nubank — ${br(r.period.from)} a ${br(r.period.to)}`);

  if (r.consentExpiresAt) {
    const daysLeft = Math.ceil((Date.parse(r.consentExpiresAt) - now.getTime()) / 86_400_000);
    if (daysLeft <= 30) {
      lines.push(`⚠  A autorização do Meu Pluggy expira em ${daysLeft} dia(s) (${br(day(r.consentExpiresAt))}). Renove no Dashboard → Demo → Connect Account → MeuPluggy.`);
    }
  }

  for (const c of r.checking) lines.push(`Saldo ${c.name}: ${money(c.balance)}`);

  const movementTable = (ms: Movement[]) => {
    if (ms.length === 0) return ['  (nenhum no período)'];
    return ms.map((m) => {
      const who = m.counterpart ? ` — ${m.counterpart}` : '';
      const pend = m.status === 'PENDING' ? ' [agendado]' : '';
      return `  ${br(m.date)}  ${money(m.amount).padStart(14)}  ${m.description}${who}${pend}`;
    });
  };

  if (sections.includes('pix')) {
    lines.push('', `PIX (${r.pix.length}) — recebido ${money(r.totals.pixIn)} · enviado ${money(r.totals.pixOut)}`);
    lines.push(...movementTable(r.pix));
  }
  if (sections.includes('boleto')) {
    lines.push('', `BOLETOS (${r.boletos.length}) — pago ${money(r.totals.boletosPaid)}`);
    lines.push(...movementTable(r.boletos));
  }
  if (sections.includes('fatura')) {
    for (const c of r.cards) {
      lines.push('', `FATURA — ${c.name}`);
      lines.push(`  Fatura aberta: ${money(c.openBalance)}  ·  fecha ${br(c.closeDate)}  ·  vence ${br(c.dueDate)}`);
      if (c.limit !== null) lines.push(`  Limite: ${money(c.limit)}  ·  disponível ${c.available !== null ? money(c.available) : '—'}`);
      if (c.bills.length === 0) {
        lines.push('  (a conexão não retornou faturas fechadas)');
      } else {
        lines.push('  Faturas fechadas:');
        for (const b of c.bills.slice(0, 6)) {
          const min = b.minimum !== null ? `  (mínimo ${money(b.minimum)})` : '';
          lines.push(`    vence ${br(b.dueDate)}  ${money(b.total).padStart(14)}${min}`);
        }
      }
    }
    if (r.cards.length === 0) lines.push('', 'FATURA — nenhum cartão de crédito encontrado nesta conexão.');
  }
  return lines.join('\n');
}
