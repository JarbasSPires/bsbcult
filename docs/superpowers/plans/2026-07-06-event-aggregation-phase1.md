# Agregação Automática de Eventos — Fase 1 (Infra + Arena BRB + Clube do Choro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full scraper pipeline (schema, dedup, change-history, GitHub Actions cron) and the UI changes it powers (Fonte filter, Comprar Ingresso, Adicionar à Agenda), shipping working end-to-end coverage for the 2 sources whose real markup has been verified: Arena BRB and Clube do Choro.

**Architecture:** A daily GitHub Actions job runs `scripts/scrape/run.ts`, which loops over a small adapter registry (`lib/scraper/adapters`). Each adapter fetches and normalizes events from one external source; a shared upsert engine (`lib/scraper/upsert.ts`) writes them into the existing `Event` table (extended with `sourceId`/`sourceUrl`/`externalId`/`lastSeenAt`), handling same-source dedup via a unique key, cross-source dedup via fuzzy title+location+date matching, and per-field change history (`EventChangeLog`). The app's existing Busca/Detail pages gain a "Fonte" filter and two new actions driven by the new `sourceUrl` field.

**Tech Stack:** Next.js 14 / TypeScript / Prisma 7 (existing), `cheerio` (new, HTML parsing), `he` (new, HTML entity decoding for WordPress REST responses), GitHub Actions (new workflow).

**Scope note:** The approved spec (`docs/superpowers/specs/2026-07-06-event-aggregation-design.md`) covers 9 sources. Only Arena BRB and Clube do Choro have been reverse-engineered against live markup/API responses — the other 7 each need their own manual inspection session before a placeholder-free adapter can be written (this is normal scraper engineering, not something resolvable at planning time). This plan ships the complete, reusable infrastructure plus these 2 adapters as working, shippable software; the remaining 7 are a separate follow-up plan.

---

## File Structure

New files:
- `lib/scraper/types.ts` — `NormalizedEvent` and `EventSourceAdapter` shared contracts.
- `lib/scraper/normalize.ts` — date-parsing and slug helpers shared by adapters.
- `lib/scraper/dedupe.ts` — cross-source duplicate matching.
- `lib/scraper/upsert.ts` — the upsert/change-log/stale-marking engine (one adapter run at a time).
- `lib/scraper/adapters/arena-brb.ts` — Arena BRB adapter (cheerio, real selectors below).
- `lib/scraper/adapters/clube-do-choro.ts` — Clube do Choro adapter (WordPress REST API).
- `lib/scraper/adapters/index.ts` — adapter registry consumed by the runner.
- `scripts/scrape/run.ts` — CLI entrypoint, run by `npm run scrape` and by GitHub Actions.
- `.github/workflows/scrape-events.yml` — daily cron + manual trigger.
- `lib/ics.ts` — `.ics` (iCalendar) file generator.
- `lib/services/event-sources.ts` — read-side service for the Fonte filter dropdown.
- `components/events/add-to-calendar-button.tsx` — client component, downloads a `.ics` file.
- Test fixtures: `tests/fixtures/arena-brb-agenda.html`, `tests/fixtures/clube-do-choro-posts.json`.
- Tests: `tests/lib/scraper/normalize.test.ts`, `tests/lib/scraper/dedupe.test.ts`, `tests/lib/scraper/upsert.test.ts`, `tests/lib/scraper/adapters/arena-brb.test.ts`, `tests/lib/scraper/adapters/clube-do-choro.test.ts`, `tests/lib/ics.test.ts`, `tests/components/add-to-calendar-button.test.tsx`, `tests/lib/services/event-sources.test.ts`.

Modified files:
- `prisma/schema.prisma` — add `EventSource`, `EventChangeLog` models; add `sourceId`/`sourceUrl`/`externalId`/`lastSeenAt` to `Event`.
- `tests/setup/test-db.ts` — truncate the 2 new tables between tests.
- `lib/services/events.ts` — `EventFilters.sourceId` + `listEvents` support (including the `"MANUAL"` sentinel for "cadastrado manualmente").
- `app/api/events/route.ts` — parse `sourceId` query param.
- `components/events/search-filters.tsx` — add a "Fonte" `<select>`.
- `app/busca/page.tsx` — fetch sources, wire the new filter through.
- `app/eventos/[id]/page.tsx` — add "Comprar Ingresso" (conditional) + `AddToCalendarButton`, fix price display for unknown-price scraped events.
- `components/events/event-card.tsx` — same price-display fix.
- `tests/components/event-card.test.tsx` — new test case for the price-display fix.
- `package.json` — add `cheerio`, `he`, `@types/he`; add `"scrape": "tsx scripts/scrape/run.ts"` script.
- `README.md` — document the scraper, GitHub Actions secrets, and the new npm script.

---

### Task 1: Add scraper dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

Run: `npm install cheerio he && npm install -D @types/he`

- [ ] **Step 2: Verify they resolve**

Run: `node -e "require('cheerio'); require('he'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add cheerio and he for event scraper"
```

---

### Task 2: Schema — EventSource, EventChangeLog, Event fields

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `tests/setup/test-db.ts`

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add two new models anywhere after `model Category` (e.g. right before `model User`):

```prisma
model EventSource {
  id            String    @id @default(cuid())
  name          String    @unique
  slug          String    @unique
  baseUrl       String
  adapterType   String
  active        Boolean   @default(true)
  lastRunAt     DateTime?
  lastRunStatus String?
  lastRunError  String?
  events        Event[]
}

model EventChangeLog {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  changedAt DateTime @default(now())
  field     String
  oldValue  String?
  newValue  String?
}
```

Modify the existing `Event` model to add the relation and new fields (insert after `createdAt`, before `favorites`):

```prisma
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
  tags            String
  featured        Boolean       @default(false)
  status          EventStatus   @default(ATIVO)
  createdAt       DateTime      @default(now())
  sourceId        String?
  source          EventSource?     @relation(fields: [sourceId], references: [id])
  sourceUrl       String?
  externalId      String?
  lastSeenAt      DateTime?
  history         EventChangeLog[]
  favorites       Favorite[]

  @@unique([sourceId, externalId])
}
```

- [ ] **Step 2: Push the schema to the local dev database**

Run: `npm run db:push`
Expected: prompts to confirm (SQLite recreate-table dance for the modified `Event` model), accept — output ends with `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate the Prisma Client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Update the shared test-DB teardown**

Edit `tests/setup/test-db.ts` — the `afterEach` must delete the 2 new tables in FK-safe order (change logs before events, sources after events):

```ts
afterEach(async () => {
  await prisma.favorite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.eventChangeLog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.eventSource.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
});
```

- [ ] **Step 5: Run the existing test suite to confirm nothing broke**

Run: `npm test`
Expected: all existing tests still PASS (schema addition is additive/nullable, no existing behavior changes).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma tests/setup/test-db.ts
git commit -m "feat: add EventSource and EventChangeLog models for event scraping"
```

> **Production note (do this manually when deploying, not part of this plan's automated steps):** `npx prisma db push`/`migrate` does not work against a `libsql://` URL (documented `P1013` limitation of the Prisma 7 CLI with driver adapters). Apply this SQL directly to the Turso database instead, via `turso db shell <db-name>`:
>
> ```sql
> CREATE TABLE "EventSource" (
>   "id" TEXT NOT NULL PRIMARY KEY,
>   "name" TEXT NOT NULL,
>   "slug" TEXT NOT NULL,
>   "baseUrl" TEXT NOT NULL,
>   "adapterType" TEXT NOT NULL,
>   "active" BOOLEAN NOT NULL DEFAULT true,
>   "lastRunAt" DATETIME,
>   "lastRunStatus" TEXT,
>   "lastRunError" TEXT
> );
> CREATE UNIQUE INDEX "EventSource_name_key" ON "EventSource"("name");
> CREATE UNIQUE INDEX "EventSource_slug_key" ON "EventSource"("slug");
>
> CREATE TABLE "EventChangeLog" (
>   "id" TEXT NOT NULL PRIMARY KEY,
>   "eventId" TEXT NOT NULL,
>   "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
>   "field" TEXT NOT NULL,
>   "oldValue" TEXT,
>   "newValue" TEXT,
>   CONSTRAINT "EventChangeLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
> );
>
> ALTER TABLE "Event" ADD COLUMN "sourceId" TEXT;
> ALTER TABLE "Event" ADD COLUMN "sourceUrl" TEXT;
> ALTER TABLE "Event" ADD COLUMN "externalId" TEXT;
> ALTER TABLE "Event" ADD COLUMN "lastSeenAt" DATETIME;
> CREATE UNIQUE INDEX "Event_sourceId_externalId_key" ON "Event"("sourceId", "externalId");
> ```
>
> (The `sourceId` FK is enforced at the Prisma/application layer, not declared in this raw SQL — SQLite's `ALTER TABLE ADD COLUMN` has inconsistent support for inline `REFERENCES` clauses across versions, and it isn't required for this feature to work correctly.)

---

### Task 3: Scraper core types

**Files:**
- Create: `lib/scraper/types.ts`

- [ ] **Step 1: Write the file**

```ts
import type { EventCategory } from "@prisma/client";

export interface NormalizedEvent {
  externalId: string;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
  price: number | null;
  isFree: boolean;
  organizer: string;
  tags: string[];
  sourceUrl: string;
}

export interface EventSourceAdapter {
  slug: string;
  name: string;
  baseUrl: string;
  adapterType: "WORDPRESS" | "HTML";
  fetchEvents(): Promise<NormalizedEvent[]>;
}
```

No test for this step — it's a pure type declaration with no runtime behavior to assert.

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scraper/types.ts
git commit -m "feat: add scraper adapter and normalized-event types"
```

---

### Task 4: Normalize helpers

**Files:**
- Create: `lib/scraper/normalize.ts`
- Test: `tests/lib/scraper/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseSlashDate, parseDayMonthWithRollover, endOfDay, slugFromUrl } from "@/lib/scraper/normalize";

describe("parseSlashDate", () => {
  it("parses DD/MM/YY into a Date", () => {
    const date = parseSlashDate("08/03/26");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(8);
  });

  it("throws on an unexpected format", () => {
    expect(() => parseSlashDate("not-a-date")).toThrow();
  });
});

describe("parseDayMonthWithRollover", () => {
  it("keeps the current year when the date is still upcoming", () => {
    const now = new Date("2026-06-01T00:00:00");
    const date = parseDayMonthWithRollover(10, 7, now);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(10);
  });

  it("rolls over to next year when the date is more than 30 days in the past", () => {
    const now = new Date("2026-06-01T00:00:00");
    const date = parseDayMonthWithRollover(1, 1, now);
    expect(date.getFullYear()).toBe(2027);
  });
});

describe("endOfDay", () => {
  it("sets the time to 23:59", () => {
    const date = endOfDay(new Date("2026-07-10T08:00:00"));
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(date.getDate()).toBe(10);
  });
});

describe("slugFromUrl", () => {
  it("extracts the last path segment", () => {
    expect(slugFromUrl("https://arenabsb.com.br/agendas/tour-nosso-mane/")).toBe("tour-nosso-mane");
  });

  it("throws when there is no usable segment", () => {
    expect(() => slugFromUrl("https://example.com/")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/scraper/normalize.test.ts`
Expected: FAIL with "Cannot find module '@/lib/scraper/normalize'"

- [ ] **Step 3: Write the implementation**

```ts
export function parseSlashDate(text: string): Date {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) throw new Error(`Data em formato inesperado: "${text}"`);
  const [, day, month, yy] = match;
  return new Date(2000 + Number(yy), Number(month) - 1, Number(day));
}

export function parseDayMonthWithRollover(day: number, month: number, now: Date = new Date()): Date {
  const candidate = new Date(now.getFullYear(), month - 1, day);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return candidate < cutoff ? new Date(now.getFullYear() + 1, month - 1, day) : candidate;
}

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);
  return end;
}

export function slugFromUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  const lastSegment = trimmed.substring(trimmed.lastIndexOf("/") + 1);
  if (!lastSegment) throw new Error(`Não foi possível extrair slug da URL: "${url}"`);
  return lastSegment;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/scraper/normalize.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/scraper/normalize.ts tests/lib/scraper/normalize.test.ts
git commit -m "feat: add date/slug normalization helpers for scraper adapters"
```

---

### Task 5: Cross-source dedup

**Files:**
- Create: `lib/scraper/dedupe.ts`
- Test: `tests/lib/scraper/dedupe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { findCrossSourceDuplicate } from "@/lib/scraper/dedupe";

const existing = [
  { id: "evt-1", title: "Real Circo - Brasília", locationName: "Arena BRB Mané Garrincha", dateStart: new Date("2026-04-17T20:00:00") },
];

describe("findCrossSourceDuplicate", () => {
  it("matches on normalized title + location + same day", () => {
    const match = findCrossSourceDuplicate(
      { title: "REAL CIRCO - BRASÍLIA!", locationName: "arena brb mané garrincha", dateStart: new Date("2026-04-17T09:00:00") },
      existing
    );
    expect(match?.id).toBe("evt-1");
  });

  it("does not match when the date differs", () => {
    const match = findCrossSourceDuplicate(
      { title: "Real Circo - Brasília", locationName: "Arena BRB Mané Garrincha", dateStart: new Date("2026-04-18T20:00:00") },
      existing
    );
    expect(match).toBeNull();
  });

  it("does not match when the location differs", () => {
    const match = findCrossSourceDuplicate(
      { title: "Real Circo - Brasília", locationName: "Clube do Choro", dateStart: new Date("2026-04-17T20:00:00") },
      existing
    );
    expect(match).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/scraper/dedupe.test.ts`
Expected: FAIL with "Cannot find module '@/lib/scraper/dedupe'"

- [ ] **Step 3: Write the implementation**

```ts
import type { Event } from "@prisma/client";

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DedupCandidate = Pick<Event, "id" | "title" | "locationName" | "dateStart">;

export function findCrossSourceDuplicate(
  candidate: { title: string; locationName: string; dateStart: Date },
  existing: DedupCandidate[]
): DedupCandidate | null {
  const candidateTitle = normalizeForComparison(candidate.title);
  const candidateLocation = normalizeForComparison(candidate.locationName);

  return (
    existing.find(
      (event) =>
        normalizeForComparison(event.title) === candidateTitle &&
        normalizeForComparison(event.locationName) === candidateLocation &&
        isSameDay(event.dateStart, candidate.dateStart)
    ) ?? null
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/scraper/dedupe.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/scraper/dedupe.ts tests/lib/scraper/dedupe.test.ts
git commit -m "feat: add cross-source event dedup matching"
```

---

### Task 6: Upsert engine (dedup + change-log + stale-marking)

**Files:**
- Create: `lib/scraper/upsert.ts`
- Test: `tests/lib/scraper/upsert.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { runAdapter } from "@/lib/scraper/upsert";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";

function makeNormalized(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    externalId: "ext-1",
    title: "Show de Teste",
    description: "Descrição de teste",
    category: "SHOW",
    imageUrl: "https://example.com/img.jpg",
    locationName: "Local de Teste",
    locationAddress: "Endereço de Teste",
    dateStart: new Date("2026-09-01T20:00:00"),
    dateEnd: new Date("2026-09-01T23:00:00"),
    price: 50,
    isFree: false,
    organizer: "Organizador Teste",
    tags: ["teste"],
    sourceUrl: "https://example.com/evento",
    ...overrides,
  };
}

function makeAdapter(events: NormalizedEvent[], slug = "fonte-teste"): EventSourceAdapter {
  return {
    slug,
    name: "Fonte de Teste",
    baseUrl: "https://example.com",
    adapterType: "HTML",
    fetchEvents: async () => events,
  };
}

describe("runAdapter", () => {
  it("creates a new event and registers the EventSource on first run", async () => {
    const result = await runAdapter(makeAdapter([makeNormalized()]));

    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);

    const source = await prisma.eventSource.findUnique({ where: { slug: "fonte-teste" } });
    expect(source?.lastRunStatus).toBe("OK");

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    expect(event?.title).toBe("Show de Teste");
  });

  it("upserts (not duplicates) the same externalId on a second run", async () => {
    await runAdapter(makeAdapter([makeNormalized()]));
    await runAdapter(makeAdapter([makeNormalized({ title: "Show de Teste (Atualizado)" })]));

    const events = await prisma.event.findMany({ where: { externalId: "ext-1" } });
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Show de Teste (Atualizado)");
  });

  it("logs a change when a tracked field changes", async () => {
    await runAdapter(makeAdapter([makeNormalized({ price: 50 })]));
    await runAdapter(makeAdapter([makeNormalized({ price: 80 })]));

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    const changes = await prisma.eventChangeLog.findMany({ where: { eventId: event!.id } });
    expect(changes.some((c) => c.field === "price" && c.newValue === "80")).toBe(true);
  });

  it("marks an event ENCERRADO when it disappears from a later run", async () => {
    await runAdapter(makeAdapter([makeNormalized()]));
    await runAdapter(makeAdapter([]));

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    expect(event?.status).toBe("ENCERRADO");
  });

  it("does not create a duplicate when a cross-source match already exists", async () => {
    await runAdapter(makeAdapter([makeNormalized()], "fonte-a"));
    await runAdapter(
      makeAdapter(
        [makeNormalized({ externalId: "outro-id", sourceUrl: "https://example.com/outro" })],
        "fonte-b"
      )
    );

    const events = await prisma.event.findMany({ where: { title: "Show de Teste" } });
    expect(events).toHaveLength(1);
  });

  it("records a failed run without throwing", async () => {
    const brokenAdapter: EventSourceAdapter = {
      slug: "fonte-quebrada",
      name: "Fonte Quebrada",
      baseUrl: "https://example.com",
      adapterType: "HTML",
      fetchEvents: async () => {
        throw new Error("Falha simulada de rede");
      },
    };

    const result = await runAdapter(brokenAdapter);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Falha simulada de rede");

    const source = await prisma.eventSource.findUnique({ where: { slug: "fonte-quebrada" } });
    expect(source?.lastRunStatus).toBe("ERROR");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/scraper/upsert.test.ts`
Expected: FAIL with "Cannot find module '@/lib/scraper/upsert'"

- [ ] **Step 3: Write the implementation**

```ts
import { prisma } from "@/lib/prisma";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { findCrossSourceDuplicate } from "@/lib/scraper/dedupe";

export interface RunResult {
  slug: string;
  ok: boolean;
  count: number;
  error?: string;
}

export async function runAdapter(adapter: EventSourceAdapter): Promise<RunResult> {
  const runStartedAt = new Date();
  const source = await prisma.eventSource.upsert({
    where: { slug: adapter.slug },
    create: {
      slug: adapter.slug,
      name: adapter.name,
      baseUrl: adapter.baseUrl,
      adapterType: adapter.adapterType,
    },
    update: { name: adapter.name, baseUrl: adapter.baseUrl },
  });

  try {
    const normalizedEvents = await adapter.fetchEvents();

    for (const normalized of normalizedEvents) {
      await upsertNormalizedEvent(source.id, normalized);
    }

    await prisma.event.updateMany({
      where: {
        sourceId: source.id,
        lastSeenAt: { lt: runStartedAt },
        dateEnd: { gt: runStartedAt },
        status: { not: "ENCERRADO" },
      },
      data: { status: "ENCERRADO" },
    });

    await prisma.eventSource.update({
      where: { id: source.id },
      data: { lastRunAt: runStartedAt, lastRunStatus: "OK", lastRunError: null },
    });

    return { slug: adapter.slug, ok: true, count: normalizedEvents.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.eventSource.update({
      where: { id: source.id },
      data: { lastRunAt: runStartedAt, lastRunStatus: "ERROR", lastRunError: message },
    });
    return { slug: adapter.slug, ok: false, count: 0, error: message };
  }
}

async function upsertNormalizedEvent(sourceId: string, normalized: NormalizedEvent): Promise<void> {
  const existingBySourceKey = await prisma.event.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: normalized.externalId } },
  });

  if (existingBySourceKey) {
    await applyUpdate(existingBySourceKey, normalized);
    return;
  }

  const dayStart = new Date(
    normalized.dateStart.getFullYear(),
    normalized.dateStart.getMonth(),
    normalized.dateStart.getDate()
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const sameDayEvents = await prisma.event.findMany({
    where: { dateStart: { gte: dayStart, lt: dayEnd } },
  });
  const duplicate = findCrossSourceDuplicate(normalized, sameDayEvents);
  if (duplicate) {
    await prisma.event.update({ where: { id: duplicate.id }, data: { lastSeenAt: new Date() } });
    return;
  }

  await prisma.event.create({
    data: {
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      imageUrl: normalized.imageUrl,
      locationName: normalized.locationName,
      locationAddress: normalized.locationAddress,
      dateStart: normalized.dateStart,
      dateEnd: normalized.dateEnd,
      price: normalized.price,
      isFree: normalized.isFree,
      organizer: normalized.organizer,
      tags: JSON.stringify(normalized.tags),
      status: "ATIVO",
      sourceId,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      lastSeenAt: new Date(),
    },
  });
}

async function applyUpdate(
  existing: { id: string; dateStart: Date; dateEnd: Date; price: number | null; locationName: string; status: string },
  normalized: NormalizedEvent
): Promise<void> {
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (existing.dateStart.getTime() !== normalized.dateStart.getTime()) {
    changes.push({
      field: "dateStart",
      oldValue: existing.dateStart.toISOString(),
      newValue: normalized.dateStart.toISOString(),
    });
  }
  if (existing.dateEnd.getTime() !== normalized.dateEnd.getTime()) {
    changes.push({
      field: "dateEnd",
      oldValue: existing.dateEnd.toISOString(),
      newValue: normalized.dateEnd.toISOString(),
    });
  }
  if (existing.price !== normalized.price) {
    changes.push({
      field: "price",
      oldValue: existing.price?.toString() ?? null,
      newValue: normalized.price?.toString() ?? null,
    });
  }
  if (existing.locationName !== normalized.locationName) {
    changes.push({ field: "locationName", oldValue: existing.locationName, newValue: normalized.locationName });
  }
  if (existing.status !== "ATIVO") {
    changes.push({ field: "status", oldValue: existing.status, newValue: "ATIVO" });
  }

  await prisma.event.update({
    where: { id: existing.id },
    data: {
      title: normalized.title,
      description: normalized.description,
      dateStart: normalized.dateStart,
      dateEnd: normalized.dateEnd,
      price: normalized.price,
      isFree: normalized.isFree,
      locationName: normalized.locationName,
      locationAddress: normalized.locationAddress,
      imageUrl: normalized.imageUrl,
      status: "ATIVO",
      lastSeenAt: new Date(),
    },
  });

  if (changes.length > 0) {
    await prisma.eventChangeLog.createMany({
      data: changes.map((c) => ({ eventId: existing.id, field: c.field, oldValue: c.oldValue, newValue: c.newValue })),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/scraper/upsert.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/scraper/upsert.ts tests/lib/scraper/upsert.test.ts
git commit -m "feat: add scraper upsert engine with dedup, change-log, and stale-marking"
```

---

### Task 7: Arena BRB adapter

**Files:**
- Create: `lib/scraper/adapters/arena-brb.ts`
- Create: `tests/fixtures/arena-brb-agenda.html`
- Test: `tests/lib/scraper/adapters/arena-brb.test.ts`

Real markup was inspected live at `https://arenabsb.com.br/agenda/`: events render server-side inside `.agenda-repeater-item` blocks (Oxygen Builder), each with a title link (`.agenda-repeater-item-content-link` / `-title`), a date span (`.agenda-repeater-item-infos-data span`, format `DD/MM/YY`), a location span (`.agenda-repeater-item-infos-local span`), a description block (`.agenda-repeater-item-content-link-text`), and a thumbnail `<img>`.

- [ ] **Step 1: Create the fixture**

```html
<!-- tests/fixtures/arena-brb-agenda.html -->
<!-- Trimmed, structurally-faithful sample of https://arenabsb.com.br/agenda/, captured 2026-07-06 -->
<div class="agenda-repeater-wrapper">
  <div class="ct-div-block bf_effect-transition agenda-repeater-item">
    <a class="ct-link event-relation-repeater-item-link" href="https://arenabsb.com.br/agendas/tour-nosso-mane/">
      <div class="ct-div-block event-relation-repeater-item-img">
        <img alt="Tour - Nosso Mané" src="https://arenabsb.com.br/wp-content/uploads/2023/06/evento-nosso-mane-feature-768x511.jpeg" class="ct-image event-relation-repeater-item-img-tag">
      </div>
    </a>
    <div class="ct-div-block agenda-repeater-item-content">
      <div class="ct-div-block agenda-repeater-item-infos">
        <div class="ct-div-block agenda-repeater-item-infos-local">
          <div class="ct-div-block fal fa-map-marker-alt agenda-repeater-item-infos-icon"></div>
          <div class="ct-text-block agenda-repeater-item-data"><span class="ct-span">Arena BRB Mané Garrincha</span></div>
        </div>
        <div class="ct-div-block agenda-repeater-item-infos-data">
          <div class="ct-div-block fal fa-calendar-alt agenda-repeater-item-infos-icon"></div>
          <div class="ct-text-block agenda-repeater-item-infos-data-text"><span class="ct-span">08/03/26</span></div>
        </div>
      </div>
      <div class="ct-div-block agenda-repeater-item-content-box">
        <a class="ct-link agenda-repeater-item-content-link" href="https://arenabsb.com.br/agendas/tour-nosso-mane/">
          <h2 class="ct-headline agenda-repeater-item-content-link-title"><span class="ct-span">Tour - Nosso Mané</span></h2>
        </a>
        <div class="ct-text-block agenda-repeater-item-content-link-text">Show em comemoração aos 30 anos de carreira.</div>
      </div>
    </div>
  </div>
  <div class="ct-div-block bf_effect-transition agenda-repeater-item">
    <a class="ct-link event-relation-repeater-item-link" href="https://arenabsb.com.br/agendas/real-circo-brasilia/">
      <div class="ct-div-block event-relation-repeater-item-img">
        <img alt="Real Circo - Brasília" src="https://arenabsb.com.br/wp-content/uploads/2026/02/20-02-2026_15-34-27-e1772135681400.jpg" class="ct-image event-relation-repeater-item-img-tag">
      </div>
    </a>
    <div class="ct-div-block agenda-repeater-item-content">
      <div class="ct-div-block agenda-repeater-item-infos">
        <div class="ct-div-block agenda-repeater-item-infos-local">
          <div class="ct-div-block fal fa-map-marker-alt agenda-repeater-item-infos-icon"></div>
          <div class="ct-text-block agenda-repeater-item-data"><span class="ct-span">Arena BRB Mané Garrincha</span></div>
        </div>
        <div class="ct-div-block agenda-repeater-item-infos-data">
          <div class="ct-div-block fal fa-calendar-alt agenda-repeater-item-infos-icon"></div>
          <div class="ct-text-block agenda-repeater-item-infos-data-text"><span class="ct-span">17/04/26</span></div>
        </div>
      </div>
      <div class="ct-div-block agenda-repeater-item-content-box">
        <a class="ct-link agenda-repeater-item-content-link" href="https://arenabsb.com.br/agendas/real-circo-brasilia/">
          <h2 class="ct-headline agenda-repeater-item-content-link-title"><span class="ct-span">Real Circo - Brasília</span></h2>
        </a>
        <div class="ct-text-block agenda-repeater-item-content-link-text">Espetáculo circense para toda a família.</div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAgendaHtml } from "@/lib/scraper/adapters/arena-brb";

describe("parseAgendaHtml", () => {
  it("parses each agenda item into a normalized event", () => {
    const html = readFileSync(join(process.cwd(), "tests/fixtures/arena-brb-agenda.html"), "utf-8");
    const events = parseAgendaHtml(html);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      externalId: "tour-nosso-mane",
      title: "Tour - Nosso Mané",
      locationName: "Arena BRB Mané Garrincha",
      category: "OUTRO",
      sourceUrl: "https://arenabsb.com.br/agendas/tour-nosso-mane/",
    });
    expect(events[0].dateStart.getFullYear()).toBe(2026);
    expect(events[0].dateStart.getMonth()).toBe(2);
    expect(events[0].dateStart.getDate()).toBe(8);
    expect(events[1].externalId).toBe("real-circo-brasilia");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/scraper/adapters/arena-brb.test.ts`
Expected: FAIL with "Cannot find module '@/lib/scraper/adapters/arena-brb'"

- [ ] **Step 4: Write the implementation**

```ts
import * as cheerio from "cheerio";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { parseSlashDate, endOfDay, slugFromUrl } from "@/lib/scraper/normalize";

const AGENDA_URL = "https://arenabsb.com.br/agenda/";
const FALLBACK_IMAGE = "https://arenabsb.com.br/wp-content/uploads/2023/05/logo-header-arena-brb.svg";
const FALLBACK_DESCRIPTION = "Evento na Arena BRB. Mais detalhes no link oficial.";
const DEFAULT_LOCATION = "Arena BRB Mané Garrincha";
const DEFAULT_ADDRESS = "SRPN, Asa Norte, Brasília - DF";

export const arenaBrbAdapter: EventSourceAdapter = {
  slug: "arena-brb",
  name: "Arena BRB",
  baseUrl: "https://arenabsb.com.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(AGENDA_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Arena BRB respondeu ${response.status}`);
    }
    return parseAgendaHtml(await response.text());
  },
};

export function parseAgendaHtml(html: string): NormalizedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedEvent[] = [];

  $(".agenda-repeater-item").each((_, element) => {
    const $item = $(element);
    const title = $item.find(".agenda-repeater-item-content-link-title").text().trim();
    const detailUrl = $item.find("a.agenda-repeater-item-content-link").attr("href");
    const dateText = $item.find(".agenda-repeater-item-infos-data span").text().trim();
    const locationName = $item.find(".agenda-repeater-item-infos-local span").text().trim();
    const description = $item.find(".agenda-repeater-item-content-link-text").text().trim();
    const imageUrl = $item.find("img").attr("src");

    if (!title || !detailUrl || !dateText) return;

    const dateStart = parseSlashDate(dateText);

    events.push({
      externalId: slugFromUrl(detailUrl),
      title,
      description: description || FALLBACK_DESCRIPTION,
      category: "OUTRO",
      imageUrl: imageUrl ?? FALLBACK_IMAGE,
      locationName: locationName || DEFAULT_LOCATION,
      locationAddress: DEFAULT_ADDRESS,
      dateStart,
      dateEnd: endOfDay(dateStart),
      price: null,
      isFree: false,
      organizer: "Arena BRB",
      tags: ["arena brb"],
      sourceUrl: detailUrl,
    });
  });

  return events;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/scraper/adapters/arena-brb.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/scraper/adapters/arena-brb.ts tests/fixtures/arena-brb-agenda.html tests/lib/scraper/adapters/arena-brb.test.ts
git commit -m "feat: add Arena BRB scraper adapter"
```

---

### Task 8: Clube do Choro adapter

**Files:**
- Create: `lib/scraper/adapters/clube-do-choro.ts`
- Create: `tests/fixtures/clube-do-choro-posts.json`
- Test: `tests/lib/scraper/adapters/clube-do-choro.test.ts`

Real API response was captured live from
`https://clubedochoro.com.br/wp-json/wp/v2/posts?categories=27&_embed=wp:featuredmedia`
(category 27 = "programação de eventos"). Post titles follow the pattern
`"DD/MM – NOME DO EVENTO"`; `title.rendered` is HTML-entity-encoded (WordPress
always escapes this field), so it must be decoded with `he`.

- [ ] **Step 1: Create the fixture**

```json
[
  {
    "id": 59233,
    "date": "2026-06-18T10:59:35",
    "link": "https://clubedochoro.com.br/07-07-baile-da-nomma-comemoracao-de-30-anos-de-carreira/",
    "title": { "rendered": "07/07 &#8211; BAILE DA NOMMA – COMEMORAÇÃO DE 30 ANOS DE CARREIRA" },
    "excerpt": { "rendered": "", "protected": false },
    "_embedded": {
      "wp:featuredmedia": [
        { "source_url": "https://clubedochoro.com.br/wp-content/uploads/2026/06/imagem_2026-06-18_105700495.png" }
      ]
    }
  },
  {
    "id": 59202,
    "date": "2026-06-16T12:28:17",
    "link": "https://clubedochoro.com.br/09-07-escafandristas-cantam-buarque/",
    "title": { "rendered": "09/07 &#8211; ESCAFANDRISTAS cantam BUARQUE" },
    "excerpt": { "rendered": "<p>Um tributo &agrave; obra de Chico Buarque.</p>", "protected": false },
    "_embedded": {}
  }
]
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWordPressPosts } from "@/lib/scraper/adapters/clube-do-choro";

describe("parseWordPressPosts", () => {
  it("parses each post into a normalized event", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/clube-do-choro-posts.json"), "utf-8");
    const events = parseWordPressPosts(JSON.parse(raw));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      externalId: "59233",
      title: "BAILE DA NOMMA – COMEMORAÇÃO DE 30 ANOS DE CARREIRA",
      locationName: "Clube do Choro",
      category: "SHOW",
      imageUrl: "https://clubedochoro.com.br/wp-content/uploads/2026/06/imagem_2026-06-18_105700495.png",
      sourceUrl: "https://clubedochoro.com.br/07-07-baile-da-nomma-comemoracao-de-30-anos-de-carreira/",
    });
    expect(events[0].dateStart.getMonth()).toBe(6);
    expect(events[0].dateStart.getDate()).toBe(7);
  });

  it("falls back to a generic description when the excerpt is empty, and a default image when there is none embedded", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/clube-do-choro-posts.json"), "utf-8");
    const events = parseWordPressPosts(JSON.parse(raw));

    expect(events[0].description).toBe("Evento no Clube do Choro. Mais detalhes no link oficial.");
    expect(events[1].description).toBe("Um tributo à obra de Chico Buarque.");
    expect(events[1].imageUrl).toContain("clubedochoro.com.br");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/scraper/adapters/clube-do-choro.test.ts`
Expected: FAIL with "Cannot find module '@/lib/scraper/adapters/clube-do-choro'"

- [ ] **Step 4: Write the implementation**

```ts
import he from "he";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { parseDayMonthWithRollover, endOfDay } from "@/lib/scraper/normalize";

const CATEGORY_ID = 27;
const API_URL = `https://clubedochoro.com.br/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=50&_embed=wp:featuredmedia`;
const FALLBACK_IMAGE = "https://clubedochoro.com.br/wp-content/uploads/2023/01/logo-clube-do-choro.png";
const FALLBACK_DESCRIPTION = "Evento no Clube do Choro. Mais detalhes no link oficial.";
const TITLE_PATTERN = /^(\d{2})\/(\d{2})\s*[–-]\s*(.+)$/s;

interface WordPressPost {
  id: number;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
}

export const clubeDoChoroAdapter: EventSourceAdapter = {
  slug: "clube-do-choro",
  name: "Clube do Choro",
  baseUrl: "https://clubedochoro.com.br",
  adapterType: "WORDPRESS",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Clube do Choro API respondeu ${response.status}`);
    }
    return parseWordPressPosts(await response.json());
  },
};

export function parseWordPressPosts(posts: WordPressPost[]): NormalizedEvent[] {
  return posts
    .map(parsePost)
    .filter((event): event is NormalizedEvent => event !== null);
}

function parsePost(post: WordPressPost): NormalizedEvent | null {
  const decodedTitle = he.decode(post.title.rendered);
  const match = decodedTitle.match(TITLE_PATTERN);
  if (!match) return null;

  const [, dayText, monthText, eventTitle] = match;
  const dateStart = parseDayMonthWithRollover(Number(dayText), Number(monthText));
  const decodedExcerpt = he.decode(post.excerpt.rendered).replace(/<[^>]+>/g, "").trim();

  return {
    externalId: String(post.id),
    title: eventTitle.trim(),
    description: decodedExcerpt || FALLBACK_DESCRIPTION,
    category: "SHOW",
    imageUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE,
    locationName: "Clube do Choro",
    locationAddress: "SCES Trecho 2, Conjunto 39 - Asa Sul, Brasília - DF",
    dateStart,
    dateEnd: endOfDay(dateStart),
    price: null,
    isFree: false,
    organizer: "Clube do Choro",
    tags: ["choro", "música ao vivo"],
    sourceUrl: post.link,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/scraper/adapters/clube-do-choro.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/scraper/adapters/clube-do-choro.ts tests/fixtures/clube-do-choro-posts.json tests/lib/scraper/adapters/clube-do-choro.test.ts
git commit -m "feat: add Clube do Choro scraper adapter"
```

---

### Task 9: Adapter registry

**Files:**
- Create: `lib/scraper/adapters/index.ts`

- [ ] **Step 1: Write the file**

```ts
import type { EventSourceAdapter } from "@/lib/scraper/types";
import { arenaBrbAdapter } from "@/lib/scraper/adapters/arena-brb";
import { clubeDoChoroAdapter } from "@/lib/scraper/adapters/clube-do-choro";

export const adapters: EventSourceAdapter[] = [arenaBrbAdapter, clubeDoChoroAdapter];
```

No test — this is a plain aggregation with no branching logic.

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scraper/adapters/index.ts
git commit -m "feat: register scraper adapters"
```

---

### Task 10: Scrape runner script

**Files:**
- Create: `scripts/scrape/run.ts`
- Modify: `package.json`

`tsx` (already used for `prisma/seed.ts`) does not resolve the `@/*` tsconfig
path alias, so this script and every file it imports transitively use
relative imports — consistent with the existing `prisma/seed.ts` convention
(`import { prisma } from "../lib/prisma"`).

- [ ] **Step 1: Write the file**

```ts
import "dotenv/config";
import { adapters } from "../../lib/scraper/adapters";
import { runAdapter } from "../../lib/scraper/upsert";

async function main() {
  let hasFailure = false;

  for (const adapter of adapters) {
    const result = await runAdapter(adapter);
    if (result.ok) {
      console.log(`[${result.slug}] OK — ${result.count} eventos processados`);
    } else {
      hasFailure = true;
      console.error(`[${result.slug}] ERRO — ${result.error}`);
    }
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main();
```

- [ ] **Step 2: Add the npm script**

Edit `package.json`, add to `"scripts"`:

```json
"scrape": "tsx scripts/scrape/run.ts"
```

- [ ] **Step 3: Verify it runs against the local dev database**

Run: `npm run scrape`
Expected: two lines like `[arena-brb] OK — N eventos processados` and `[clube-do-choro] OK — N eventos processados` (network-dependent — if either live site is temporarily unreachable, that line will show `ERRO` without stopping the other adapter; re-run later to confirm).

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape/run.ts package.json
git commit -m "feat: add scrape runner script and npm run scrape"
```

---

### Task 11: GitHub Actions daily cron

**Files:**
- Create: `.github/workflows/scrape-events.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Scrape cultural events

on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch: {}

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run scrape
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```

- [ ] **Step 2: Register the required secrets**

In the GitHub repo settings (`Settings > Secrets and variables > Actions`),
add `DATABASE_URL` and `TURSO_AUTH_TOKEN` with the same production values
already configured in Vercel.

Run: `gh secret list --repo JarbasSPires/bsbcult`
Expected (after adding them manually via the GitHub UI, since secret values
cannot be read back): `DATABASE_URL` and `TURSO_AUTH_TOKEN` listed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/scrape-events.yml
git commit -m "ci: add daily GitHub Actions cron for event scraping"
```

---

### Task 12: `.ics` file generator

**Files:**
- Create: `lib/ics.ts`
- Test: `tests/lib/ics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildIcsFile } from "@/lib/ics";

describe("buildIcsFile", () => {
  it("produces a valid VEVENT block with the expected fields", () => {
    const ics = buildIcsFile({
      id: "evt-1",
      title: "Show de Rock",
      description: "Uma noite de rock autoral",
      locationName: "CCBB Brasília",
      locationAddress: "SCES Trecho 2",
      dateStart: new Date("2026-08-01T20:00:00Z"),
      dateEnd: new Date("2026-08-01T23:00:00Z"),
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:evt-1@bsbcult.com.br");
    expect(ics).toContain("SUMMARY:Show de Rock");
    expect(ics).toContain("LOCATION:CCBB Brasília\\, SCES Trecho 2");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes commas, semicolons, and newlines in free-text fields", () => {
    const ics = buildIcsFile({
      id: "evt-2",
      title: "Evento; especial, com vírgula",
      description: "Linha 1\nLinha 2",
      locationName: "Local",
      locationAddress: "Endereço",
      dateStart: new Date("2026-08-01T20:00:00Z"),
      dateEnd: new Date("2026-08-01T23:00:00Z"),
    });

    expect(ics).toContain("SUMMARY:Evento\\; especial\\, com vírgula");
    expect(ics).toContain("DESCRIPTION:Linha 1\\nLinha 2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ics.test.ts`
Expected: FAIL with "Cannot find module '@/lib/ics'"

- [ ] **Step 3: Write the implementation**

```ts
interface IcsEventInput {
  id: string;
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsFile(event: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BsbCult//Guia Cultural de Brasilia//PT",
    "BEGIN:VEVENT",
    `UID:${event.id}@bsbcult.com.br`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.dateStart)}`,
    `DTEND:${toIcsDate(event.dateEnd)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(`${event.locationName}, ${event.locationAddress}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/ics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ics.ts tests/lib/ics.test.ts
git commit -m "feat: add .ics calendar file generator"
```

---

### Task 13: AddToCalendarButton component

**Files:**
- Create: `components/events/add-to-calendar-button.tsx`
- Test: `tests/components/add-to-calendar-button.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCalendarButton } from "@/components/events/add-to-calendar-button";

afterEach(cleanup);

const baseProps = {
  id: "evt-1",
  title: "Show de Rock",
  description: "Uma noite de rock autoral",
  locationName: "CCBB Brasília",
  locationAddress: "SCES Trecho 2",
  dateStart: new Date("2026-08-01T20:00:00Z"),
  dateEnd: new Date("2026-08-01T23:00:00Z"),
};

describe("AddToCalendarButton", () => {
  it("triggers a file download when clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<AddToCalendarButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /adicionar à agenda/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/add-to-calendar-button.test.tsx`
Expected: FAIL with "Cannot find module '@/components/events/add-to-calendar-button'"

- [ ] **Step 3: Write the implementation**

```tsx
"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildIcsFile } from "@/lib/ics";

interface AddToCalendarButtonProps {
  id: string;
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
}

export function AddToCalendarButton(event: AddToCalendarButtonProps) {
  function handleClick() {
    const ics = buildIcsFile(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <CalendarPlus className="h-4 w-4" />
      Adicionar à Agenda
    </Button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/add-to-calendar-button.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/events/add-to-calendar-button.tsx tests/components/add-to-calendar-button.test.tsx
git commit -m "feat: add AddToCalendarButton component"
```

---

### Task 14: EventSource read service

**Files:**
- Create: `lib/services/event-sources.ts`
- Test: `tests/lib/services/event-sources.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { listEventSources } from "@/lib/services/event-sources";

describe("listEventSources", () => {
  it("returns sources ordered by name", async () => {
    await prisma.eventSource.create({
      data: { name: "Clube do Choro", slug: "clube-do-choro", baseUrl: "https://clubedochoro.com.br", adapterType: "WORDPRESS" },
    });
    await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });

    const sources = await listEventSources();
    expect(sources.map((s) => s.name)).toEqual(["Arena BRB", "Clube do Choro"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/services/event-sources.test.ts`
Expected: FAIL with "Cannot find module '@/lib/services/event-sources'"

- [ ] **Step 3: Write the implementation**

```ts
import { prisma } from "@/lib/prisma";
import type { EventSource } from "@prisma/client";

export async function listEventSources(): Promise<EventSource[]> {
  return prisma.eventSource.findMany({ orderBy: { name: "asc" } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/services/event-sources.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/services/event-sources.ts tests/lib/services/event-sources.test.ts
git commit -m "feat: add EventSource read service"
```

---

### Task 15: `sourceId` filter in the Event service

**Files:**
- Modify: `lib/services/events.ts`
- Modify: `tests/lib/services/events.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/services/events.test.ts`, inside the `describe("listEvents", ...)` block:

```ts
  it("filters by sourceId", async () => {
    const source = await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });
    await makeEvent({ title: "Da Arena", sourceId: source.id });
    await makeEvent({ title: "Manual" });

    const result = await listEvents({ sourceId: source.id });
    expect(result.map((e) => e.title)).toEqual(["Da Arena"]);
  });

  it("filters to only manually-created events with the MANUAL sentinel", async () => {
    const source = await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });
    await makeEvent({ title: "Da Arena", sourceId: source.id });
    await makeEvent({ title: "Manual" });

    const result = await listEvents({ sourceId: "MANUAL" });
    expect(result.map((e) => e.title)).toEqual(["Manual"]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/services/events.test.ts`
Expected: FAIL (`sourceId` not recognized by `listEvents`/`EventFilters`)

- [ ] **Step 3: Update the implementation**

Edit `lib/services/events.ts` — add `sourceId` to `EventFilters` and handle it in `listEvents`:

```ts
export interface EventFilters {
  q?: string;
  category?: EventCategory;
  isFree?: boolean;
  status?: EventStatus;
  dateFrom?: Date;
  dateTo?: Date;
  sourceId?: string;
}
```

```ts
  if (filters.category) where.category = filters.category;
  if (filters.isFree !== undefined) where.isFree = filters.isFree;
  if (filters.status) where.status = filters.status;
  if (filters.sourceId === "MANUAL") where.sourceId = null;
  else if (filters.sourceId) where.sourceId = filters.sourceId;
```

(Insert the `sourceId` branch right after the existing `filters.status` line, keeping the rest of `listEvents` unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/services/events.test.ts`
Expected: PASS (all tests, including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/services/events.ts tests/lib/services/events.test.ts
git commit -m "feat: add sourceId filter (with MANUAL sentinel) to listEvents"
```

---

### Task 16: `sourceId` query param in the Events API

**Files:**
- Modify: `app/api/events/route.ts`

- [ ] **Step 1: Edit the `GET` handler**

```ts
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const category = (params.get("category") as EventCategory | null) ?? undefined;
  const status = (params.get("status") as EventStatus | null) ?? undefined;
  const isFreeParam = params.get("isFree");
  const dateFromParam = params.get("dateFrom");
  const dateToParam = params.get("dateTo");
  const sourceId = params.get("sourceId") ?? undefined;

  const events = await listEvents({
    q,
    category: category ?? undefined,
    status: status ?? undefined,
    isFree: isFreeParam === null ? undefined : isFreeParam === "true",
    dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
    dateTo: dateToParam ? new Date(dateToParam) : undefined,
    sourceId,
  });

  return NextResponse.json(events);
}
```

- [ ] **Step 2: Run the existing API tests**

Run: `npx vitest run tests/api/events.test.ts`
Expected: PASS (no existing test asserted on the full call signature; this is additive)

- [ ] **Step 3: Commit**

```bash
git add app/api/events/route.ts
git commit -m "feat: accept sourceId query param on GET /api/events"
```

---

### Task 17: "Fonte" filter in the search UI

**Files:**
- Modify: `components/events/search-filters.tsx`

- [ ] **Step 1: Edit the component**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { Category, EventSource } from "@prisma/client";

export function SearchFilters({
  categories,
  sources,
}: {
  categories: Category[];
  sources: EventSource[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome, categoria ou local..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          defaultValue={searchParams.get("category") ?? ""}
          onChange={(e) => updateParam("category", e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          defaultValue={searchParams.get("isFree") ?? ""}
          onChange={(e) => updateParam("isFree", e.target.value)}
        >
          <option value="">Gratuito ou pago</option>
          <option value="true">Gratuito</option>
          <option value="false">Pago</option>
        </select>
        <select
          className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          defaultValue={searchParams.get("sourceId") ?? ""}
          onChange={(e) => updateParam("sourceId", e.target.value)}
        >
          <option value="">Todas as fontes</option>
          <option value="MANUAL">Cadastrado manualmente</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: errors at every call site of `<SearchFilters>` missing the new required `sources` prop — this is expected and gets fixed in Task 18.

- [ ] **Step 3: Commit**

Hold off on committing until Task 18 (the call site) is also updated, so the working tree stays type-check-clean at each commit.

---

### Task 18: Wire the filter into the Busca page

**Files:**
- Modify: `app/busca/page.tsx`

- [ ] **Step 1: Edit the page**

```tsx
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { listEvents } from "@/lib/services/events";
import { listEventSources } from "@/lib/services/event-sources";
import { SearchFilters } from "@/components/events/search-filters";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { EventCategory } from "@prisma/client";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; isFree?: string; sourceId?: string };
}) {
  const [categories, sources] = await Promise.all([listCategories(), listEventSources()]);
  const events = await listEvents({
    q: searchParams.q,
    category: (searchParams.category as EventCategory) || undefined,
    isFree: searchParams.isFree === undefined ? undefined : searchParams.isFree === "true",
    sourceId: searchParams.sourceId || undefined,
    status: "ATIVO",
  });
  const categoriesByValue = categoryMap(categories);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Buscar Eventos</h1>
      <SearchFilters categories={categories} sources={sources} />
      {events.length === 0 ? (
        <EmptyState
          title="Nenhum evento encontrado"
          description="Tente ajustar sua busca ou remover alguns filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks and existing tests still pass**

Run: `npx tsc --noEmit && npm test`
Expected: no errors, all tests PASS.

- [ ] **Step 3: Commit (both Task 17 and Task 18 files together)**

```bash
git add components/events/search-filters.tsx app/busca/page.tsx
git commit -m "feat: add Fonte filter to the search page"
```

---

### Task 19: Event detail page — Comprar Ingresso, Adicionar à Agenda, price fix

**Files:**
- Modify: `app/eventos/[id]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the top of the file:

```ts
import { Button } from "@/components/ui/button";
import { AddToCalendarButton } from "@/components/events/add-to-calendar-button";
import { MapPin, Ticket } from "lucide-react";
```

(Replace the existing `import { MapPin } from "lucide-react";` line with the combined import above.)

- [ ] **Step 2: Fix the price display for events with an unknown price**

Replace:

```tsx
        <p className={event.isFree ? "text-lg font-bold text-primary" : "text-lg font-bold text-gray-900"}>
          {formatPrice(event.price, event.isFree)}
        </p>
```

With:

```tsx
        <p className={event.isFree ? "text-lg font-bold text-primary" : "text-lg font-bold text-gray-900"}>
          {event.isFree || event.price != null ? formatPrice(event.price, event.isFree) : "Confira o valor no site oficial"}
        </p>
```

(This matters now that scraped events can have `price: null` and `isFree: false` at the same time — meaning "unknown", not "free". `formatPrice` itself is unchanged, since existing tests pin its `price == null → "Gratuito"` behavior for the manually-curated-event case.)

- [ ] **Step 3: Add the new action buttons**

Replace:

```tsx
        <div className="flex gap-3">
          <FavoriteButton eventId={event.id} />
          <ShareButton title={event.title} />
        </div>
```

With:

```tsx
        <div className="flex flex-wrap gap-3">
          <FavoriteButton eventId={event.id} />
          <ShareButton title={event.title} />
          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <Ticket className="h-4 w-4" />
                Comprar Ingresso
              </Button>
            </a>
          )}
          <AddToCalendarButton
            id={event.id}
            title={event.title}
            description={event.description}
            locationName={event.locationName}
            locationAddress={event.locationAddress}
            dateStart={event.dateStart}
            dateEnd={event.dateEnd}
          />
        </div>
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/eventos/[id]/page.tsx
git commit -m "feat: add Comprar Ingresso and Adicionar à Agenda to event detail page"
```

---

### Task 20: EventCard price-display fix

**Files:**
- Modify: `components/events/event-card.tsx`
- Modify: `tests/components/event-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `tests/components/event-card.test.tsx`, inside `describe("EventCard", ...)`:

```ts
  it("shows a fallback label when price is unknown and the event isn't free", () => {
    render(<EventCard event={{ ...baseEvent, isFree: false, price: null }} category={category} />);
    expect(screen.getByText("Confira o valor no site oficial")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/event-card.test.tsx`
Expected: FAIL — renders "Gratuito" instead of the fallback text.

- [ ] **Step 3: Apply the same fix as Task 19**

Replace, in `components/events/event-card.tsx`:

```tsx
          <p className={event.isFree ? "font-semibold text-primary" : "font-semibold text-gray-800"}>
            {formatPrice(event.price, event.isFree)}
          </p>
```

With:

```tsx
          <p className={event.isFree ? "font-semibold text-primary" : "font-semibold text-gray-800"}>
            {event.isFree || event.price != null ? formatPrice(event.price, event.isFree) : "Confira o valor no site oficial"}
          </p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/event-card.test.tsx`
Expected: PASS (all 4 tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add components/events/event-card.tsx tests/components/event-card.test.tsx
git commit -m "fix: show fallback label instead of 'Gratuito' when a scraped event's price is unknown"
```

---

### Task 21: README and env docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a new section**

Insert after the "## Scripts" section (or wherever the existing scripts are documented):

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document the event scraper and GitHub Actions secrets"
```

---

### Task 22: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests PASS (existing + all new ones added in this plan).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the scraper against the local dev database and inspect the result**

Run: `npm run scrape && npx prisma studio`
Expected: `EventSource` table has 2 rows (`arena-brb`, `clube-do-choro`) with `lastRunStatus: "OK"`; `Event` table has new rows with `sourceId`/`sourceUrl` populated. Close Prisma Studio when done.

- [ ] **Step 4: Manually verify the UI in the browser**

Run: `npm run dev`, then in a browser:
- Open `/busca`, confirm the new "Fonte" dropdown lists "Arena BRB" and "Clube do Choro" plus "Cadastrado manualmente", and that selecting one filters results.
- Open the detail page of a scraped event, confirm "Comprar Ingresso" opens the original source URL in a new tab, and "Adicionar à Agenda" downloads a `.ics` file that opens correctly in a calendar app.

- [ ] **Step 5: Push**

```bash
git push origin master
```

(Or open a PR, per the team's existing workflow — this project has pushed directly to `master`/`main` for prior features.)
