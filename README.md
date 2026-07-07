# BsbCult

Seu guia definitivo para a vida cultural no Distrito Federal — descubra shows, festivais, peças de teatro e exposições em Brasília.

## Stack

Next.js 14 (App Router) · TypeScript · Prisma 7 + libSQL/Turso (via driver adapter) · NextAuth.js · Tailwind CSS · Vitest

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
- `PrismaClient` requires a **driver adapter** to work with SQLite (`@prisma/adapter-libsql` + `@libsql/client`, wired up in `lib/prisma.ts`). A plain `new PrismaClient()` throws at runtime on this version.
- The libSQL adapter works transparently against a local SQLite file (`DATABASE_URL="file:./prisma/dev.db"`, no token needed) in development, and against a remote **Turso** database (`DATABASE_URL="libsql://..."` + `TURSO_AUTH_TOKEN`) in production — no code changes between environments, only env vars.

## Credenciais de teste (seed)

- **Admin:** admin@bsbcult.com / admin123
- **Usuário:** usuario@bsbcult.com / usuario123

## Scripts

- `npm run dev` — inicia o servidor de desenvolvimento
- `npm test` — roda a suíte de testes (Vitest)
- `npm run db:seed` — repopula o banco com dados de exemplo
- `npm run db:studio` — abre o Prisma Studio
- `npm run scrape` — roda a agregação automática de eventos (ver seção abaixo)

## Agregação automática de eventos (scraper)

Um workflow do GitHub Actions (`.github/workflows/scrape-events.yml`) roda
diariamente às 6h (horário de Brasília) e busca eventos em fontes externas
estruturadas (hoje: Arena BRB e Clube do Choro — cobertura de mais fontes é
trabalho incremental, ver `docs/superpowers/specs/2026-07-06-event-aggregation-design.md`).

Rodar localmente:

```bash
npm run scrape
```

Requer os mesmos `DATABASE_URL`/`TURSO_AUTH_TOKEN` do `.env`. Em produção, o
workflow do GitHub Actions usa os secrets do repositório (`Settings > Secrets
and variables > Actions`) com os mesmos valores configurados na Vercel.

Eventos coletados automaticamente têm `sourceUrl` preenchido e mostram um
botão extra "Comprar Ingresso" na página de detalhe, linkando para a página
original da fonte.

## Status

Aplicação completa: navegação pública (Home, Busca, Calendário, Detalhe do Evento),
autenticação (Cadastro, Login, Esqueci/Redefinir senha), Favoritos, e Painel
Administrativo (Dashboard, CRUD de Eventos e Categorias, listagem de Usuários).
