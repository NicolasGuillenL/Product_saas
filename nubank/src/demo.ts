import type { ReportInput } from './report.js';

/** Dados fictícios no formato da Pluggy, para testar o script sem credenciais (--demo). */
export function demoInput(from: string, to: string, now = new Date()): ReportInput {
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  return {
    from,
    to,
    now,
    item: { id: 'demo-item', status: 'UPDATED', consentExpiresAt: d(-300) },
    accounts: [
      { id: 'conta', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Conta Nubank', number: '1234567-8', balance: 2350.42, currencyCode: 'BRL' },
      {
        id: 'cartao', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Nubank Mastercard', number: '4321', balance: 812.9, currencyCode: 'BRL',
        creditData: { creditLimit: 5000, availableCreditLimit: 4187.1, balanceCloseDate: d(-6), balanceDueDate: d(-13), minimumPayment: 121.94 },
      },
    ],
    transactionsByAccount: {
      conta: [
        { id: 't1', accountId: 'conta', date: d(1), description: 'Transferência recebida pelo Pix', amount: 150, currencyCode: 'BRL', type: 'CREDIT', status: 'POSTED', operationType: 'PIX', paymentData: { payer: { name: 'Maria Souza' }, paymentMethod: 'PIX' } },
        { id: 't2', accountId: 'conta', date: d(3), description: 'Transferência enviada pelo Pix', amount: -89.9, currencyCode: 'BRL', type: 'DEBIT', status: 'POSTED', operationType: 'PIX', paymentData: { receiver: { name: 'Padaria Central' }, paymentMethod: 'PIX' } },
        { id: 't3', accountId: 'conta', date: d(5), description: 'Pagamento de boleto efetuado', amount: -210.35, currencyCode: 'BRL', type: 'DEBIT', status: 'POSTED', operationType: 'BOLETO', paymentData: { receiver: { name: 'Enel Distribuição' } } },
        { id: 't4', accountId: 'conta', date: d(8), description: 'Pagamento de fatura', amount: -1024.5, currencyCode: 'BRL', type: 'DEBIT', status: 'POSTED', operationType: 'OUTROS' },
        { id: 't5', accountId: 'conta', date: d(12), description: 'Pagamento de conta - Claro', amount: -99.99, currencyCode: 'BRL', type: 'DEBIT', status: 'POSTED', operationType: 'CONVENIO_ARRECADACAO' },
        { id: 't6', accountId: 'conta', date: d(-2), description: 'Pix agendado', amount: -500, currencyCode: 'BRL', type: 'DEBIT', status: 'PENDING', operationType: 'PIX', paymentData: { receiver: { name: 'João Lima' } } },
      ],
      cartao: [],
    },
    billsByAccount: {
      cartao: [
        { id: 'b1', dueDate: d(17), billClosingDate: d(24), totalAmount: 1024.5, totalAmountCurrencyCode: 'BRL', minimumPaymentAmount: 153.68 },
        { id: 'b2', dueDate: d(48), billClosingDate: d(55), totalAmount: 932.1, totalAmountCurrencyCode: 'BRL', minimumPaymentAmount: 139.82 },
      ],
    },
  };
}
