// Subconjunto dos modelos da API Pluggy que o script usa.
// Referência: https://docs.pluggy.ai/en/docs/products/accounts.md (e transactions / credit-card-bills)

export interface Account {
  id: string;
  type: 'BANK' | 'CREDIT';
  subtype: 'CHECKING_ACCOUNT' | 'SAVINGS_ACCOUNT' | 'CREDIT_CARD' | string;
  name: string;
  number: string;
  balance: number;
  currencyCode: string;
  creditData?: {
    balanceCloseDate?: string | null;
    balanceDueDate?: string | null;
    availableCreditLimit?: number | null;
    creditLimit?: number | null;
    minimumPayment?: number | null;
  } | null;
}

export interface Party {
  name?: string | null;
  documentNumber?: { type: string; value: string } | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currencyCode: string;
  type: 'DEBIT' | 'CREDIT';
  status: 'POSTED' | 'PENDING';
  operationType?: string | null;
  category?: string | null;
  paymentData?: {
    payer?: Party | null;
    receiver?: Party | null;
    paymentMethod?: string | null;
    reason?: string | null;
    boletoMetadata?: Record<string, unknown> | null;
  } | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
  } | null;
}

export interface Bill {
  id: string;
  dueDate: string;
  billClosingDate?: string | null;
  totalAmount: number;
  totalAmountCurrencyCode: string;
  minimumPaymentAmount?: number | null;
  payments?: { amount: number; paymentDate: string }[];
}

export interface Item {
  id: string;
  status: string;
  consentExpiresAt?: string | null;
  lastUpdatedAt?: string | null;
  connector?: { name: string } | null;
}
