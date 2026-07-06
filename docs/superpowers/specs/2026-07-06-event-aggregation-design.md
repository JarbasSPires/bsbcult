# BsbCult — Agregação Automática de Eventos (Scraper)

**Data:** 2026-07-06
**Status:** Rascunho para revisão

## Visão geral

Hoje o BsbCult só tem eventos cadastrados manualmente pelo admin. Este
recurso adiciona uma coleta automática diária de eventos culturais de
Brasília a partir de 10 fontes externas, alimentando o mesmo banco que já
serve Home/Busca/Calendário — sem mudar a experiência dessas páginas além
de novos filtros e dois botões novos no card/detalhe do evento.

## Fontes (Grupo A — 10 fontes com dados estruturados)

| # | Fonte | URL | Tipo de adapter |
|---|---|---|---|
| 1 | Shotgun/Infinu | (mapeado na fase anterior) | HTML |
| 2 | Sympla | (mapeado na fase anterior) | HTML |
| 3 | Toinha | (mapeado na fase anterior) | HTML |
| 4 | Arena BRB | `arenabsb.com.br/agenda/` | WordPress (`wp-json`) |
| 5 | Caixa Cultural | `caixacultural.gov.br/Paginas/Programacao.aspx` | HTML (ASP.NET) |
| 6 | Clube do Choro | `clubedochoro.com.br` | WordPress (`wp-json`) |
| 7 | SESI Lab | `sesilab.com.br` | HTML (Liferay) |
| 8 | Secretaria de Cultura do DF | `cultura.df.gov.br` | HTML (Liferay/GDF) |
| 9 | SESC-DF | `sescdf.com.br` | HTML (Liferay + Senna.js) |
| 10 | Expressão Brasiliense | `expressaobrasiliense.com/cultura/` | WordPress (`wp-json`) |

Descartadas nesta fase (decisão explícita do usuário): De Boa Brasília,
Metrópoles, Correio Braziliense (sites de imprensa, sem dados estruturados
de evento — exigiriam extração de texto livre, técnica diferente de
parsing de listagem); Espaço Cultural Renato Russo e Funarte (sem
calendário próprio independente — seus eventos já aparecem via Sympla e/ou
Secretaria de Cultura do DF).

**Risco conhecido, a resolver durante implementação (não bloqueia o
design):** para Caixa Cultural, Secretaria de Cultura do DF e SESC-DF, a
URL de listagem completa de eventos ainda não foi confirmada com precisão
(Caixa Cultural navega por `idEvento=N` sem índice claro; a página de
Cultura do DF testada era uma página de CTA, não a listagem real; SESC-DF
usa navegação via Senna.js e a listagem real fica em `/eventos`, ainda não
inspecionada em detalhe). Cada adapter HTML resolve isso individualmente
na implementação; nenhuma dessas fontes exige navegador headless — todas
respondem HTML útil na primeira requisição.

## Arquitetura

Um único workflow do **GitHub Actions**, rodando 1x por dia, executa um
script Node/TS (`scripts/scrape/run.ts`) que itera sobre 10 módulos
adapter, cada um implementando a mesma interface:

```ts
interface EventSourceAdapter {
  slug: string;
  fetchEvents(): Promise<NormalizedEvent[]>;
}
```

Dois adapters-base reutilizáveis:
- `WordPressAdapter` — consome `wp-json/wp/v2/posts` (ou custom post type,
  se o site tiver um para eventos) das 3 fontes WordPress (Arena BRB,
  Clube do Choro, Expressão Brasiliense).
- `HtmlAdapter` — busca a página com `fetch` e faz parsing com `cheerio`,
  um seletor CSS específico por fonte (as 7 fontes restantes).

Cada adapter roda isolado em `try/catch`: uma fonte fora do ar ou com
layout mudado não impede as outras 9 de rodarem. Falhas são logadas em
`EventSource.lastRunStatus`/`lastRunError` (ver modelo de dados), não
derrubam o job inteiro.

Ao final, o runner faz upsert de todos os eventos coletados direto no
banco Turso via Prisma Client (mesma configuração já usada pelo app —
sem infra nova, sem serviço separado).

## Modelo de dados (adições ao `prisma/schema.prisma`)

```prisma
model EventSource {
  id            String    @id @default(cuid())
  name          String    @unique
  slug          String    @unique
  baseUrl       String
  adapterType   String    // "WORDPRESS" | "HTML"
  active        Boolean   @default(true)
  lastRunAt     DateTime?
  lastRunStatus String?   // "OK" | "ERROR"
  lastRunError  String?
  events        Event[]
}

model EventChangeLog {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  changedAt DateTime @default(now())
  field     String   // "dateStart" | "dateEnd" | "price" | "locationName" | "status"
  oldValue  String?
  newValue  String?
}
```

Adições ao `Event` existente:

```prisma
model Event {
  // ...campos existentes inalterados...
  sourceId    String?
  source      EventSource? @relation(fields: [sourceId], references: [id])
  sourceUrl   String?          // link original do evento na fonte (Comprar Ingresso / redirecionamento)
  externalId  String?          // id/slug do evento na fonte, usado para upsert/dedup
  lastSeenAt  DateTime?        // atualizado a cada scrape que encontra o evento de novo
  history     EventChangeLog[]

  @@unique([sourceId, externalId])
}
```

Eventos criados manualmente pelo admin continuam com `sourceId: null` —
nenhuma mudança no fluxo de admin existente.

## Deduplicação

- **Mesma fonte, execuções diferentes:** chave única `(sourceId,
  externalId)` — o upsert do Prisma atualiza o evento existente em vez de
  criar duplicata.
- **Fontes diferentes, mesmo evento** (ex.: um show na Arena BRB que
  também aparece na Sympla): match por título normalizado (lowercase, sem
  acento/pontuação) + mesmo `locationName` + mesma data (dia). Quando
  bate, mantém o registro já existente (não cria segundo `Event`) e só
  atualiza campos se a nova fonte trouxer informação mais completa (ex.:
  preço, quando o registro existente está com `price: null`). O
  `sourceUrl` já salvo não é sobrescrito — a fonte que "chegou primeiro"
  continua sendo a referência de redirecionamento.
- Nenhuma tentativa de merge de múltiplas `sourceUrl` por evento nesta
  versão (YAGNI — um evento tem uma fonte de referência primária).

## Histórico de mudanças

A cada upsert, o runner compara os campos rastreados (`dateStart`,
`dateEnd`, `price`, `locationName`, `status`) contra o valor já salvo. Se
mudou, grava uma linha em `EventChangeLog` com valor antigo/novo — isso
cobre o requisito de rastrear mudanças de data, preço ou local de um
evento já publicado.

**Eventos que somem da fonte:** se um evento com `sourceId` não aparece em
duas execuções consecutivas do scraper e sua `dateEnd` ainda não passou,
o runner marca `status: ENCERRADO` (tratado como possivelmente cancelado).
Eventos com `dateEnd` no passado já seguem essa mesma regra
independentemente do scraper.

## Filtros de busca (adição)

Além dos filtros já existentes (categoria, data, gratuito/pago), a página
de Busca ganha um filtro **"Fonte"** (multi-select com as 10 fontes +
"Cadastrado manualmente"), útil para o usuário que confia mais em um
local/curador específico.

## UI — Card e Detalhe do evento

Três ações, condicionadas à origem do evento:

- **Ver Detalhes** — sempre visível, leva para `/eventos/[id]` (página
  interna do BsbCult), igual ao comportamento atual.
- **Comprar Ingresso** — só aparece quando `event.sourceUrl` existe;
  abre a URL original da fonte em nova aba (`target="_blank"
  rel="noopener noreferrer"`). Eventos manuais sem `sourceUrl` não
  mostram esse botão.
- **Adicionar à Agenda** — gera e baixa um arquivo `.ics` (evento único,
  campos `SUMMARY`/`DTSTART`/`DTEND`/`LOCATION`/`DESCRIPTION` a partir dos
  dados do `Event`), compatível com Agenda do iPhone, Google Calendar e
  Outlook via importação de arquivo. Disponível para todo evento,
  independente da origem.

## Agendamento

`.github/workflows/scrape-events.yml`, cron diário (`0 9 * * *` UTC ≈
6h em Brasília), usando os secrets do repositório `DATABASE_URL` e
`TURSO_AUTH_TOKEN` (mesmos valores já configurados na Vercel, cadastrados
separadamente como GitHub Actions secrets). Execução manual também
disponível via `workflow_dispatch` para depuração.

## Fora de escopo (nesta versão)

- As 3 fontes de imprensa (De Boa Brasília, Metrópoles, Correio
  Braziliense) e as 2 fontes redundantes (Espaço Cultural Renato Russo,
  Funarte) — podem ser revisitadas depois com uma abordagem de extração
  de texto (NLP), diferente da usada aqui.
- Merge/consolidação de múltiplas `sourceUrl` para o mesmo evento.
- Navegador headless (Playwright/Puppeteer) — nenhuma das 10 fontes
  exigiu isso na checagem técnica.
- Painel admin para gerenciar `EventSource` (ativar/desativar fonte,
  ver histórico de execução) — fica como melhoria futura; nesta versão
  o campo `active` existe no schema mas só é editável direto no banco.

## Testes

- Unidade: normalização de dados por adapter (título, data, preço),
  lógica de dedup (mesma fonte e cross-fonte), geração do `.ics`.
- Integração: upsert idempotente (rodar o mesmo fetch duas vezes não gera
  duplicata), geração de `EventChangeLog` quando um campo rastreado muda,
  marcação de `ENCERRADO` quando um evento some por 2 execuções seguidas.
- Cada adapter testado com fixture de HTML/JSON salva localmente (sem
  bater na rede durante os testes).
