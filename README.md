# BsbCult

Seu guia definitivo para a vida cultural no Distrito Federal — descubra shows, festivais, peças de teatro e exposições em Brasília.

## Stack

Next.js 14 (App Router) · TypeScript · Prisma 7 + SQLite (via driver adapter) · NextAuth.js · Tailwind CSS · Vitest

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000.

> `.env` must exist **before** `npm run db:push`: this project uses `prisma.config.ts` (Prisma 7 no longer reads a `url` from `schema.prisma`), which loads `DATABASE_URL` from `.env` via `dotenv/config`. Without it, Prisma commands fail to find the database.
>
> `npm install` already runs `prisma generate` automatically (`postinstall` script), so no extra generate step is needed.
>
> `NEXTAUTH_SECRET` in `.env` (`"dev-only-secret-change-me"`) is a **dev-only placeholder**. It MUST be replaced with a strong random value (e.g. `openssl rand -base64 32`) before any real/production deployment.

### Note on Prisma 7

This project runs **Prisma 7.8.0**, not the Prisma 5-era setup you might expect:

- The datasource `url` lives in `prisma.config.ts`, not in `schema.prisma` — schema-level `url` is no longer supported.
- `PrismaClient` requires a **driver adapter** to work with SQLite (`@prisma/adapter-better-sqlite3` + `better-sqlite3`, wired up in `lib/prisma.ts`). A plain `new PrismaClient()` throws at runtime on this version.

## Credenciais de teste (seed)

- **Admin:** admin@bsbcult.com / admin123
- **Usuário:** usuario@bsbcult.com / usuario123

## Scripts

- `npm run dev` — inicia o servidor de desenvolvimento
- `npm test` — roda a suíte de testes (Vitest)
- `npm run db:seed` — repopula o banco com dados de exemplo
- `npm run db:studio` — abre o Prisma Studio

## Status

Fundação (banco de dados, Home, Busca, Calendário, Detalhe do Evento) implementada.
Autenticação, Favoritos e Painel Admin fazem parte de uma segunda fase de implementação.
