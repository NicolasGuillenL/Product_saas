import { describe, expect, it } from 'vitest';
import { demoInput } from '../src/demo.js';
import { buildReport, classify, formatReport } from '../src/report.js';
import type { Transaction } from '../src/types.js';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'x', accountId: 'a', date: '2026-11-01T00:00:00.000Z', description: '', amount: -10,
  currencyCode: 'BRL', type: 'DEBIT', status: 'POSTED', ...over,
});

describe('classify', () => {
  it('usa operationType do Open Finance', () => {
    expect(classify(tx({ operationType: 'PIX' }))).toBe('pix');
    expect(classify(tx({ operationType: 'BOLETO' }))).toBe('boleto');
    expect(classify(tx({ operationType: 'CONVENIO_ARRECADACAO' }))).toBe('boleto');
    expect(classify(tx({ operationType: 'TED' }))).toBe('outro');
  });
  it('usa paymentData.paymentMethod e boletoMetadata', () => {
    expect(classify(tx({ paymentData: { paymentMethod: 'PIX' } }))).toBe('pix');
    expect(classify(tx({ paymentData: { boletoMetadata: { digitableLine: '1' } } }))).toBe('boleto');
  });
  it('cai na descrição quando não há tipo', () => {
    expect(classify(tx({ description: 'Transferência enviada pelo Pix' }))).toBe('pix');
    expect(classify(tx({ description: 'Pagamento de boleto' }))).toBe('boleto');
    expect(classify(tx({ description: 'Compra no débito' }))).toBe('outro');
    expect(classify(tx({ description: 'Pixel Store' }))).toBe('outro');
  });
});

describe('buildReport', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const r = buildReport(demoInput('2026-10-10', '2026-11-09', now));

  it('separa pix e boletos com sinal e contraparte', () => {
    expect(r.pix.map((m) => m.id)).toEqual(['t6', 't1', 't2']);
    expect(r.pix.find((m) => m.id === 't1')).toMatchObject({ amount: 150, direction: 'entrada', counterpart: 'Maria Souza' });
    expect(r.pix.find((m) => m.id === 't2')).toMatchObject({ amount: -89.9, direction: 'saida', counterpart: 'Padaria Central' });
    expect(r.boletos.map((m) => m.id)).toEqual(['t3', 't5']);
  });

  it('soma totais', () => {
    expect(r.totals).toEqual({ pixIn: 150, pixOut: 589.9, boletosPaid: 310.34 });
  });

  it('monta o resumo do cartão com faturas da mais nova para a mais antiga', () => {
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ openBalance: 812.9, limit: 5000, available: 4187.1 });
    expect(r.cards[0].bills.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('formata texto só com as seções pedidas', () => {
    const txt = formatReport(r, ['fatura'], now);
    expect(txt).toContain('FATURA — Nubank Mastercard');
    expect(txt).not.toContain('PIX (');
  });

  it('avisa quando a autorização do Meu Pluggy está para expirar', () => {
    const soon = { ...r, consentExpiresAt: '2026-11-20T00:00:00Z' };
    expect(formatReport(soon, ['pix'], now)).toContain('expira em 11 dia(s)');
    expect(formatReport(r, ['pix'], now)).not.toContain('expira');
  });
});
