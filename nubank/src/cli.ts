import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { demoInput } from './demo.js';
import { PluggyClient } from './pluggy.js';
import { buildReport, formatReport, type ReportInput, type Section } from './report.js';
import type { Bill, Transaction } from './types.js';

const HELP = `Uso: npm start -- [opções]

  --dias N        período em dias até hoje (padrão 30, máx. ~365)
  --de AAAA-MM-DD início do período (substitui --dias)
  --ate AAAA-MM-DD fim do período (padrão: hoje)
  --tipo LISTA    pix,boleto,fatura (padrão: todos)
  --json          imprime o relatório em JSON (para planilha/automação)
  --demo          usa dados fictícios, sem credenciais
  -h, --help      esta ajuda

Variáveis (.env): PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_ITEM_ID`;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const { values } = parseArgs({
    options: {
      dias: { type: 'string', default: '30' },
      de: { type: 'string' },
      ate: { type: 'string' },
      tipo: { type: 'string', default: 'pix,boleto,fatura' },
      json: { type: 'boolean', default: false },
      demo: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) return console.log(HELP);

  const sections = values.tipo!.split(',').map((s) => s.trim()) as Section[];
  const invalid = sections.filter((s) => !['pix', 'boleto', 'fatura'].includes(s));
  if (invalid.length) throw new Error(`--tipo inválido: ${invalid.join(', ')}`);

  const now = new Date();
  const to = values.ate ?? isoDay(now);
  const days = Number(values.dias);
  if (!values.de && (!Number.isFinite(days) || days <= 0)) throw new Error('--dias precisa ser um número positivo');
  const from = values.de ?? isoDay(new Date(Date.parse(to) - days * 86_400_000));

  const input = values.demo ? demoInput(from, to, now) : await fetchInput(from, to, sections);
  const report = buildReport(input);
  console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report, sections, now));
}

async function fetchInput(from: string, to: string, sections: Section[]): Promise<ReportInput> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_ITEM_ID } = process.env;
  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET || !PLUGGY_ITEM_ID) {
    throw new Error('Faltam variáveis. Copie .env.example para .env e preencha (veja o README). Para testar sem conta: npm run demo');
  }
  const client = new PluggyClient({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET });

  const [item, accounts] = await Promise.all([
    client.getItem(PLUGGY_ITEM_ID).catch(() => null), // só para o aviso de expiração; não é essencial
    client.listAccounts(PLUGGY_ITEM_ID),
  ]);
  if (accounts.length === 0) {
    throw new Error('A conexão não retornou contas. Se a autorização do Meu Pluggy expirou (1 ano), renove no Dashboard → Demo → Connect Account → MeuPluggy.');
  }

  const needTx = sections.includes('pix') || sections.includes('boleto');
  const transactionsByAccount: Record<string, Transaction[]> = {};
  const billsByAccount: Record<string, Bill[]> = {};
  await Promise.all(
    accounts.map(async (acc) => {
      if (acc.type === 'BANK' && needTx) {
        transactionsByAccount[acc.id] = await client.listTransactions(acc.id, from, to);
      }
      if (acc.subtype === 'CREDIT_CARD' && sections.includes('fatura')) {
        billsByAccount[acc.id] = await client.listBills(acc.id).catch(() => []);
      }
    }),
  );
  return { item, accounts, transactionsByAccount, billsByAccount, from, to };
}

main().catch((err: Error) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});
