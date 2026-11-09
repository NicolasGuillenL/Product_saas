# Nubank → Pix, boletos e faturas (via Pluggy / Open Finance)

Script de linha de comando que lê **sua própria** conta Nubank pelo Open Finance e mostra:

- **Pix** enviados e recebidos (com nome de quem pagou/recebeu, quando o banco informa)
- **Boletos** e contas de convênio pagos
- **Fatura** do cartão: valor aberto, fechamento, vencimento, limite e faturas fechadas

Não usa senha do Nubank nem API "pirata": o acesso é autorizado no app do Nubank via Open Finance
pelo **Meu Pluggy**, que é **gratuito para uso pessoal** (até 5 conexões, sem uso comercial).

```
Nubank — 10/10/2026 a 09/11/2026
Saldo Conta Nubank: R$ 2.350,42

PIX (3) — recebido R$ 150,00 · enviado R$ 589,90
  08/11/2026       R$ 150,00  Transferência recebida pelo Pix — Maria Souza
  06/11/2026       -R$ 89,90  Transferência enviada pelo Pix — Padaria Central

BOLETOS (2) — pago R$ 310,34
  04/11/2026      -R$ 210,35  Pagamento de boleto efetuado — Enel Distribuição

FATURA — Nubank Mastercard
  Fatura aberta: R$ 812,90  ·  fecha 15/11/2026  ·  vence 22/11/2026
  Limite: R$ 5.000,00  ·  disponível R$ 4.187,10
```

## Testar agora (sem conta)

```bash
cd nubank
npm install
npm run demo
```

## Configurar com sua conta (uma vez, ~10 min)

1. **Meu Pluggy:** crie conta em [meu.pluggy.ai](https://meu.pluggy.ai) e conecte o **Nubank**
   (CPF + aprovação no app do Nubank).
2. **Pluggy Dashboard:** entre em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) **com o mesmo e-mail**.
   Vá em **Applications → sua aplicação → Demo → Connect Account** e escolha o conector
   **MeuPluggy**, não o Nubank (se pedir CPF de novo, você escolheu o conector errado).
3. **Copie os dados:**
   - `PLUGGY_ITEM_ID`: na mesma tela Demo, em *Connected Items*, clique no item do Nubank.
   - `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`: em **Applications**. O secret só aparece quando é gerado;
     se perdeu, gere outro.
4. `cp .env.example .env` e preencha.

```bash
npm start                         # últimos 30 dias, tudo
npm start -- --dias 90            # últimos 90 dias
npm start -- --tipo fatura        # só fatura
npm start -- --de 2026-10-01 --ate 2026-10-31 --tipo pix,boleto
npm start -- --json > saida/nubank.json   # para planilha / automação
```

## Bom saber

- **Atualização:** o Meu Pluggy sincroniza com o Nubank a cada 24h, então não é tempo real.
- **Autorização vence em 1 ano.** O script avisa quando faltarem 30 dias. Para renovar, repita o passo 2.
  Depois da renovação, confira se o `itemId` mudou.
- **Histórico:** até 12 meses de transações.
- **Classificação:** usa o `operationType` do Open Finance (`PIX`, `BOLETO`, `CONVENIO_ARRECADACAO`).
  Se o campo vier vazio, usa a descrição da transação.
- **Faturas fechadas** dependem do que o banco envia pelo Open Finance. Se não vierem, o script mostra
  só a fatura aberta (fechamento, vencimento e limite vêm sempre da conta do cartão).
- O `.env` está no `.gitignore`. Nunca commite o `CLIENT_SECRET`.

## Estrutura

```
src/pluggy.ts   cliente HTTP da Pluggy (auth, contas, /v2/transactions com cursor, /bills)
src/report.ts   classifica Pix/boleto, monta o relatório e formata o texto
src/cli.ts      argumentos, .env e orquestração
src/demo.ts     dados fictícios para --demo
test/           testes (npm test)
```

Docs da API: [Meu Pluggy para uso pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use.md)
