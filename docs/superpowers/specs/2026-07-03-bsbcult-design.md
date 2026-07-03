# BsbCult — Design Spec

**Data:** 2026-07-03
**Status:** Aprovado para planejamento

## Visão geral

BsbCult é um guia cultural completo para Brasília/DF: descoberta de shows,
festivais, teatro e exposições com curadoria e busca/filtragem. App web
full-stack, responsivo, com autenticação de usuário e painel administrativo
para gestão de conteúdo.

**Tagline:** "Seu guia definitivo para a vida cultural no Distrito Federal"

## Stack técnica

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** + **SQLite** (arquivo `dev.db`, versionável via migrations,
  fácil de trocar para Postgres depois trocando o `datasource` do schema)
- **NextAuth.js** (Credentials Provider) para autenticação, sessão JWT em
  cookie, senha com hash via `bcrypt`
- **Tailwind CSS** + **shadcn/ui** para o design system
- **Vitest** (ou Jest) + **React Testing Library** para testes de unidade/
  componentes; testes de rota de API cobrindo CRUD e regras de autorização

Sem dependências de serviços externos (sem Supabase, sem envio real de
email) — o projeto roda inteiro localmente com `npm install && npm run dev`.

## Modelo de dados (Prisma)

```prisma
enum EventCategory {
  SHOW
  FESTIVAL
  TEATRO
  EXPOSICAO
  CINEMA
  OUTRO
}

enum EventStatus {
  ATIVO
  ENCERRADO
  EM_BREVE
}

enum UserRole {
  USER
  ADMIN
}

model Event {
  id              String        @id @default(cuid())
  title           String
  description     String
  category        EventCategory
  imageUrl        String
  locationName    String
  locationAddress String
  dateStart       DateTime
  dateEnd         DateTime
  price           Float?
  isFree          Boolean       @default(false)
  organizer       String
  tags            String        // JSON-encoded string[] (SQLite has no native array type)
  featured        Boolean       @default(false)
  status          EventStatus   @default(ATIVO)
  createdAt       DateTime      @default(now())
  favorites       Favorite[]
}

model Category {
  id          String @id @default(cuid())
  name        String @unique
  icon        String
  color       String
  description String
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  avatarUrl     String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  favorites     Favorite[]
  resetTokens   PasswordResetToken[]
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  eventId   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([userId, eventId])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Notas:
- `tags` é armazenado como JSON string em SQLite (sem tipo array nativo);
  serializado/desserializado na camada de API.
- `Category.name` é único e usado como chave de exibição/filtro; o enum
  `EventCategory` no `Event` é o valor canônico usado em filtros e badges
  (evita depender de FK solta para algo tão estável).

## Autenticação e autorização

- Registro (`/cadastro`) cria `User` com `role: USER`, senha com hash
  bcrypt.
- Login (`/login`) via NextAuth Credentials Provider; sessão JWT contém
  `id`, `email`, `role`.
- Middleware (`middleware.ts`) protege `/admin/**`: redireciona para `/login`
  se não autenticado, retorna 403/redireciona para `/` se `role !== ADMIN`.
- Middleware/verificação também protege `/favoritos` (requer login,
  redireciona para `/login` com `callbackUrl`).
- "Esqueci minha senha" (`/esqueci-senha`): gera `PasswordResetToken` com
  expiração de 1h, e — como não há provedor de email configurado — a tela
  de confirmação exibe diretamente o link de reset (`/redefinir-senha?token=...`)
  em vez de enviar por email. Isso é claramente rotulado como "modo dev" na
  UI, com um comentário no código apontando onde plugar um provedor real
  (Resend/SendGrid) depois.
- `/redefinir-senha`: valida token não expirado, atualiza `passwordHash`,
  invalida o token.
- Login social (Google) mencionado como opcional no requisito original —
  **fora de escopo** desta primeira versão (fica como nota de melhoria
  futura, não bloqueia o restante).

## Estrutura de páginas (App Router)

| Rota | Página | Auth |
|---|---|---|
| `/` | Home | pública |
| `/busca` | Busca com filtros | pública |
| `/calendario` | Calendário mensal/semanal | pública |
| `/favoritos` | Favoritos do usuário | requer login |
| `/eventos/[id]` | Detalhe do evento | pública |
| `/login` | Login | pública (redireciona se já logado) |
| `/cadastro` | Registro | pública |
| `/esqueci-senha` | Solicitar reset | pública |
| `/redefinir-senha` | Definir nova senha | pública (via token) |
| `/admin` | Dashboard com métricas | requer role ADMIN |
| `/admin/eventos` | CRUD de eventos | requer role ADMIN |
| `/admin/categorias` | CRUD de categorias | requer role ADMIN |
| `/admin/usuarios` | Listagem de usuários | requer role ADMIN |

Layout compartilhado: header (logo + tagline + busca em desktop) e bottom
navigation fixo (Home, Busca, Calendário, Favoritos, Perfil) em mobile;
vira nav lateral/topo em telas largas (responsivo).

## API routes

CRUD REST via Route Handlers do App Router (`app/api/**/route.ts`):

- `GET/POST /api/events`, `GET/PUT/DELETE /api/events/[id]` — leitura
  pública; escrita restrita a ADMIN.
- `GET/POST /api/categories`, `PUT/DELETE /api/categories/[id]` — mesma
  regra.
- `GET /api/users` (ADMIN only, listagem).
- `POST /api/favorites`, `DELETE /api/favorites/[eventId]`, `GET
  /api/favorites` — autenticado, escopado ao usuário da sessão.
- `POST /api/auth/register`, `POST /api/auth/forgot-password`, `POST
  /api/auth/reset-password` — públicas com validação de input (Zod).
- `[...nextauth]` route padrão do NextAuth para login/sessão.

Todas as rotas de escrita validam payload com **Zod** e retornam 400 com
mensagens de erro estruturadas em caso de payload inválido.

## Design system

- Cores: primária `#6366f1` (índigo), secundária `#f97316` (laranja/coral),
  fundo branco/cinza-claro (`#f9fafb`), texto `#1f2937`. Definidas como
  variáveis CSS/tema Tailwind (`tailwind.config.ts`).
- Tipografia: `Inter` (sans-serif moderna, via `next/font`).
- Cards: `rounded-2xl`, `shadow-sm` com `hover:shadow-md`, badges de
  categoria com cor própria por categoria (mapeada em `Category.color`).
- Ícones: `lucide-react` (estilo outline/line, combina com o pedido).
- Estados: skeleton loaders (shimmer) para listas/cards durante fetch;
  empty states ilustrados com ícone + texto amigável (ex.: "Nenhum evento
  encontrado", "Você ainda não favoritou nenhum evento").
- Sem dark mode nesta primeira versão (conforme "Não (ou opcional)" do
  requisito — fica como melhoria futura, não implementado agora).

## Dados de exemplo (seed)

`prisma/seed.ts` popula:
- 5 `Category` (Show, Festival, Teatro, Exposição, Cinema) com ícone e cor.
- 16 `Event` cobrindo os subtipos pedidos (Rock, Sertanejo, MPB, Eletrônica;
  Gastronomia, Música, Arte; Comédia, Drama, Infantil; Arte, Fotografia,
  História), datas entre julho e dezembro de 2026, mix gratuito/pago
  (R$20–R$350), locais reais de Brasília (CCBB Brasília, Teatro Nacional
  Cláudio Santoro, Conjunto Nacional, Parque da Cidade Sarah Kubitschek,
  Estádio Mané Garrincha, Complexo Cultural da República, Museu Nacional,
  Cine Brasília, Espaço Cultural Renato Russo), imagens via URLs do
  Unsplash.
- 2 `User`: um ADMIN (`admin@bsbcult.com`) e um USER comum de teste, ambos
  com senha conhecida documentada no README (apenas para ambiente de
  desenvolvimento).
- Alguns `Favorite` de exemplo ligando o usuário de teste a eventos, para
  a tela de Favoritos não nascer vazia na demo.

## Testes

- Unidade: funções puras (formatação de preço/data, helpers de filtro).
- Integração de API: cada route handler de CRUD testado para caminho feliz
  + regra de autorização (ex.: `POST /api/events` sem sessão ADMIN retorna
  401/403).
- Componentes: cards de evento, badges de categoria, empty states,
  formulários de auth (validação de campos).

## Fora de escopo (v1)

- Login social (Google)
- Dark mode
- Envio real de email (reset de senha é "modo dev" com link exibido na
  tela)
- Upload de imagem (usa URLs externas no seed; formulário admin aceita URL
  de imagem, não upload de arquivo)
- Deploy em produção (Vercel etc.) — fica só no GitHub por enquanto

## Repositório e entrega

- Novo repositório `JarbasSPires/bsbcult`, público, criado via `gh repo
  create ... --source=. --push`.
- README com: descrição do projeto, stack, instruções de setup (`npm
  install`, copiar `.env.example` para `.env`, `npx prisma migrate dev`,
  `npm run db:seed`, `npm run dev`), credenciais de teste (admin/usuário
  comum), estrutura de pastas.
- `.env.example` documentando `DATABASE_URL` e `NEXTAUTH_SECRET`.
- `.gitignore` padrão Next.js + `dev.db` (banco não versionado; gerado via
  migration+seed).
