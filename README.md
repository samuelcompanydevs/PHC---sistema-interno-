# PHC Pedidos — versão para Vercel

Sistema interno do quiosque PHC Espetinho. Registra pedidos, itens, quantidades, atendente, forma de pagamento, valores, troco, situação e cancelamentos. Os dados ficam em um banco Postgres online e são compartilhados entre todos os celulares.

## Publicar temporariamente na Vercel

1. Extraia este arquivo ZIP e coloque a pasta em um repositório privado no GitHub.
2. Na Vercel, clique em **Add New → Project**, importe o repositório e mantenha o framework **Next.js**.
3. Na página do projeto na Vercel, abra **Storage/Marketplace**, procure **Neon** e conecte um banco Postgres ao projeto.
4. Confirme que a variável `DATABASE_URL` foi adicionada aos ambientes Production, Preview e Development.
5. Faça um novo **Deploy**. Na primeira utilização, as tabelas serão criadas automaticamente.

O banco online é necessário para que Romualdo, Penélope, Patricia e Atendente 3 vejam os mesmos pedidos em aparelhos diferentes.

## Rodar no computador (opcional)

Requer Node.js 20 ou mais recente e uma conexão Postgres/Neon.

```bash
npm install
cp .env.example .env.local
# Edite .env.local e informe a sua DATABASE_URL
npm run dev
```

Acesse `http://localhost:3000`.

## Relatórios e planilha

Na aba **Relatórios**, escolha dia, semana ou mês. O botão de exportação gera um arquivo CSV que abre no Google Sheets e no Excel.

## Segurança

Nunca envie o arquivo `.env.local` nem publique a senha do banco. A variável `DATABASE_URL` deve ficar configurada somente na Vercel.
