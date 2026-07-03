# BsbCult — Foundation & Public Browsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the BsbCult Next.js app, set up the Prisma/SQLite database with seed data, and ship the fully working public-facing experience: Home, Busca, Calendário, and Event Detail pages, with no auth required yet.

**Architecture:** Next.js 14 App Router + TypeScript, Prisma + SQLite for persistence, business logic isolated in `lib/services/*` (testable independent of HTTP), thin API route handlers, Tailwind-based UI kit (no Radix — plain styled primitives) for the design system.

**Tech Stack:** Next.js 14, React 18, TypeScript, Prisma 5, SQLite, Tailwind CSS, lucide-react, date-fns, Zod, Vitest + Testing Library.

**Companion plan:** `docs/superpowers/plans/2026-07-03-bsbcult-auth-admin.md` adds NextAuth, Favoritos, and the Admin panel on top of this foundation. Some links (Login, Perfil) will 404 until that plan runs — that's expected.

**Spec:** `docs/superpowers/specs/2026-07-03-bsbcult-design.md`

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Run create-next-app inside the existing repo**

```bash
cd "C:/Users/Eterc/Desktop/BsbCult"
npx create-next-app@14.2.5 . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm
```

When prompted (it shouldn't prompt with these flags, but if it does): TypeScript = Yes, ESLint = Yes, Tailwind = Yes, `src/` directory = No, App Router = Yes, import alias = `@/*`.

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, default Next.js starter page loads with no console errors. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 app"
```

---

### Task 2: Install project dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install prisma @prisma/client next-auth@4 bcryptjs zod lucide-react date-fns clsx tailwind-merge class-variance-authority
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D tsx vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/bcryptjs
```

- [ ] **Step 3: Add npm scripts**

Edit `package.json`, add to `"scripts"`:

```json
"db:push": "prisma db push",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio",
"test": "vitest run",
"test:watch": "vitest"
```

Add below the `"scripts"` block (top-level key):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install prisma, next-auth, zod, and test dependencies"
```

---

### Task 3: Configure Tailwind theme and root layout shell

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Update `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f97316",
          dark: "#ea580c",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-800 antialiased;
}
```

- [ ] **Step 3: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "BsbCult — Guia Cultural de Brasília",
  description:
    "Seu guia definitivo para a vida cultural no Distrito Federal: shows, festivais, teatro, exposições e cinema.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: blank page (default `app/page.tsx` still has starter content, that's fine for now), no errors in terminal.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "feat: configure design system theme and root layout"
```

---

### Task 4: Prisma schema and first migration

**Files:**
- Create: `prisma/schema.prisma`, `.env`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

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
  tags            String
  featured        Boolean       @default(false)
  status          EventStatus   @default(ATIVO)
  createdAt       DateTime      @default(now())
  favorites       Favorite[]
}

model Category {
  id          String        @id @default(cuid())
  name        String        @unique
  value       EventCategory @unique
  icon        String
  color       String
  description String
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  avatarUrl    String?
  role         UserRole  @default(USER)
  createdAt    DateTime  @default(now())
  favorites    Favorite[]
  resetTokens  PasswordResetToken[]
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

- [ ] **Step 2: Create `.env` and `.env.example`**

`.env`:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-only-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
```

`.env.example` (same content, committed):
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-random-32-byte-string"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Add ignores to `.gitignore`**

Append if not already present:
```
/prisma/dev.db
/prisma/test.db
.env
```

- [ ] **Step 4: Push schema to create the database**

```bash
npm run db:push
```

Expected: `prisma/dev.db` created, output ends with "Your database is now in sync with your Prisma schema."

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma .env.example .gitignore
git commit -m "feat: add Prisma schema for events, categories, users, favorites"
```

---

### Task 5: Prisma client singleton and utility helpers

**Files:**
- Create: `lib/prisma.ts`, `lib/utils.ts`
- Test: `tests/lib/utils.test.ts`

- [ ] **Step 1: Write `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Write the failing test for `lib/utils.ts`**

```ts
// tests/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatEventDate,
  parseTags,
  serializeTags,
} from "@/lib/utils";

describe("formatPrice", () => {
  it("returns 'Gratuito' when isFree is true", () => {
    expect(formatPrice(50, true)).toBe("Gratuito");
  });

  it("returns 'Gratuito' when price is null", () => {
    expect(formatPrice(null, false)).toBe("Gratuito");
  });

  it("formats a paid price as BRL currency", () => {
    expect(formatPrice(89.9, false)).toBe("R$ 89,90");
  });
});

describe("formatEventDate", () => {
  it("formats a date in pt-BR short form", () => {
    const date = new Date("2026-08-15T20:30:00");
    const result = formatEventDate(date);
    expect(result).toContain("ago");
    expect(result).toContain("20:30");
  });
});

describe("tags serialization", () => {
  it("round-trips an array of tags", () => {
    const tags = ["rock", "ao vivo"];
    expect(parseTags(serializeTags(tags))).toEqual(tags);
  });

  it("returns an empty array for malformed JSON", () => {
    expect(parseTags("not json")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/utils.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils'` (file doesn't exist yet).

- [ ] **Step 4: Write `lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null, isFree: boolean): string {
  if (isFree || price == null) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function parseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/utils.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/prisma.ts lib/utils.ts tests/lib/utils.test.ts
git commit -m "feat: add Prisma client singleton and formatting utilities"
```

---

### Task 6: Test infrastructure (Vitest + isolated test database)

**Files:**
- Create: `vitest.config.ts`, `tests/setup/test-db.ts`, `.env.test`

- [ ] **Step 1: Write `.env.test`**

```
DATABASE_URL="file:./prisma/test.db"
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/test-db.ts"],
    env: {
      DATABASE_URL: "file:./prisma/test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 3: Write `tests/setup/test-db.ts`**

```ts
import { execSync } from "child_process";
import { beforeAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { prisma } from "@/lib/prisma";

beforeAll(() => {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
    stdio: "inherit",
  });
});

afterEach(async () => {
  await prisma.favorite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
});
```

- [ ] **Step 4: Run the existing test suite against the new config**

Run: `npm run test`
Expected: PASS — `tests/lib/utils.test.ts` still passes, and the test database `prisma/test.db` is created (visible via `ls prisma/`).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup/test-db.ts .env.test
git commit -m "test: add Vitest config with isolated SQLite test database"
```

---

### Task 7: Category and Event services (with tests)

**Files:**
- Create: `lib/services/categories.ts`, `lib/services/events.ts`
- Test: `tests/lib/services/categories.test.ts`, `tests/lib/services/events.test.ts`

- [ ] **Step 1: Write the failing test for categories service**

```ts
// tests/lib/services/categories.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { listCategories } from "@/lib/services/categories";

describe("listCategories", () => {
  it("returns categories ordered by name", async () => {
    await prisma.category.createMany({
      data: [
        { name: "Teatro", value: "TEATRO", icon: "Theater", color: "#f97316", description: "Peças e espetáculos" },
        { name: "Cinema", value: "CINEMA", icon: "Film", color: "#6366f1", description: "Filmes e mostras" },
      ],
    });

    const result = await listCategories();
    expect(result.map((c) => c.name)).toEqual(["Cinema", "Teatro"]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/categories.test.ts`
Expected: FAIL — `Cannot find module '@/lib/services/categories'`.

- [ ] **Step 3: Write `lib/services/categories.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}
```

`categoryMap` (the `EventCategory -> Category` lookup used by every page that renders `EventCard`) lives in `lib/category-icons.ts` instead of here — see Task 10, Step 1. Keeping it out of this file matters: this file imports the Prisma client, and `components/calendar/month-grid.tsx` (a Client Component) needs `categoryMap` too. If a Client Component imported anything from a Prisma-backed module, bundlers cannot reliably tree-shake the Prisma import out of the browser bundle.

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/categories.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing tests for events service**

```ts
// tests/lib/services/events.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listEvents,
  getFeaturedEvents,
  getEventById,
  getRelatedEvents,
} from "@/lib/services/events";

async function makeEvent(overrides: Partial<Parameters<typeof prisma.event.create>[0]["data"]> = {}) {
  return prisma.event.create({
    data: {
      title: "Show de Rock",
      description: "Uma noite de rock autoral",
      category: "SHOW",
      imageUrl: "https://example.com/img.jpg",
      locationName: "CCBB Brasília",
      locationAddress: "SCES Trecho 2",
      dateStart: new Date("2026-08-01T20:00:00"),
      dateEnd: new Date("2026-08-01T23:00:00"),
      price: 50,
      isFree: false,
      organizer: "Produtora X",
      tags: JSON.stringify(["rock"]),
      featured: false,
      status: "ATIVO",
      ...overrides,
    },
  });
}

describe("listEvents", () => {
  it("filters by search query across title, description, and location", async () => {
    await makeEvent({ title: "Festival de Jazz" });
    await makeEvent({ title: "Peça Infantil", description: "Diversão garantida" });

    const result = await listEvents({ q: "jazz" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Festival de Jazz");
  });

  it("filters by category", async () => {
    await makeEvent({ category: "SHOW" });
    await makeEvent({ category: "TEATRO" });

    const result = await listEvents({ category: "TEATRO" });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("TEATRO");
  });

  it("filters by isFree", async () => {
    await makeEvent({ isFree: true, price: null });
    await makeEvent({ isFree: false, price: 100 });

    const result = await listEvents({ isFree: true });
    expect(result).toHaveLength(1);
    expect(result[0].isFree).toBe(true);
  });

  it("orders results by dateStart ascending", async () => {
    await makeEvent({ title: "Depois", dateStart: new Date("2026-09-01") });
    await makeEvent({ title: "Antes", dateStart: new Date("2026-08-01") });

    const result = await listEvents();
    expect(result.map((e) => e.title)).toEqual(["Antes", "Depois"]);
  });
});

describe("getFeaturedEvents", () => {
  it("returns only featured, active events", async () => {
    await makeEvent({ title: "Destaque", featured: true, status: "ATIVO" });
    await makeEvent({ title: "Normal", featured: false });
    await makeEvent({ title: "Encerrado", featured: true, status: "ENCERRADO" });

    const result = await getFeaturedEvents();
    expect(result.map((e) => e.title)).toEqual(["Destaque"]);
  });
});

describe("getEventById", () => {
  it("returns the event when found", async () => {
    const created = await makeEvent();
    const result = await getEventById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("returns null when not found", async () => {
    const result = await getEventById("does-not-exist");
    expect(result).toBeNull();
  });
});

describe("getRelatedEvents", () => {
  it("returns active events in the same category, excluding itself", async () => {
    const main = await makeEvent({ category: "SHOW" });
    const related = await makeEvent({ title: "Outro Show", category: "SHOW" });
    await makeEvent({ title: "Show Encerrado", category: "SHOW", status: "ENCERRADO" });
    await makeEvent({ title: "Teatro", category: "TEATRO" });

    const result = await getRelatedEvents(main);
    expect(result.map((e) => e.id)).toEqual([related.id]);
  });
});
```

- [ ] **Step 6: Run tests, verify they fail**

Run: `npx vitest run tests/lib/services/events.test.ts`
Expected: FAIL — `Cannot find module '@/lib/services/events'`.

- [ ] **Step 7: Write `lib/services/events.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { Event, EventCategory, EventStatus, Prisma } from "@prisma/client";

export interface EventFilters {
  q?: string;
  category?: EventCategory;
  isFree?: boolean;
  status?: EventStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function listEvents(filters: EventFilters = {}): Promise<Event[]> {
  const where: Prisma.EventWhereInput = {};

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
      { locationName: { contains: filters.q } },
    ];
  }
  if (filters.category) where.category = filters.category;
  if (filters.isFree !== undefined) where.isFree = filters.isFree;
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    where.dateStart = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  return prisma.event.findMany({ where, orderBy: { dateStart: "asc" } });
}

export async function getFeaturedEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    where: { featured: true, status: "ATIVO" },
    orderBy: { dateStart: "asc" },
    take: 10,
  });
}

export async function getEventById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } });
}

export async function getRelatedEvents(event: {
  id: string;
  category: EventCategory;
}): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      category: event.category,
      id: { not: event.id },
      status: "ATIVO",
    },
    take: 4,
    orderBy: { dateStart: "asc" },
  });
}
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `npx vitest run tests/lib/services/events.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 9: Commit**

```bash
git add lib/services tests/lib/services
git commit -m "feat: add category and event services with test coverage"
```

---

### Task 8: Seed script with sample data

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Show", value: "SHOW" as const, icon: "Music", color: "#6366f1", description: "Shows de música ao vivo" },
  { name: "Festival", value: "FESTIVAL" as const, icon: "PartyPopper", color: "#f97316", description: "Festivais de música, arte e gastronomia" },
  { name: "Teatro", value: "TEATRO" as const, icon: "Theater", color: "#ec4899", description: "Peças, comédias e espetáculos" },
  { name: "Exposição", value: "EXPOSICAO" as const, icon: "ImageIcon", color: "#10b981", description: "Exposições de arte, fotografia e história" },
  { name: "Cinema", value: "CINEMA" as const, icon: "Film", color: "#0ea5e9", description: "Filmes e mostras de cinema" },
];

const events = [
  { title: "Rock na Concha - Banda Aurora", description: "Uma noite de rock autoral com a banda Aurora, com participação especial de convidados locais.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3", locationName: "Concha Acústica", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-11T20:00:00"), dateEnd: new Date("2026-07-11T23:30:00"), price: 60, isFree: false, organizer: "Aurora Produções", tags: ["rock", "banda autoral", "ao vivo"], featured: true },
  { title: "Sertanejo Universitário - Duo Terra Boa", description: "O melhor do sertanejo universitário com Duo Terra Boa, direto de Goiânia.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7", locationName: "Espaço Cultural Renato Russo", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-18T21:00:00"), dateEnd: new Date("2026-07-19T01:00:00"), price: 90, isFree: false, organizer: "Terra Boa Produções", tags: ["sertanejo", "universitário"], featured: false },
  { title: "Noite de MPB - Trio Cerrado", description: "Clássicos da MPB revisitados por um trio de músicos brasilienses.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f", locationName: "CCBB Brasília", locationAddress: "SCES Trecho 2, Brasília - DF", dateStart: new Date("2026-08-02T19:30:00"), dateEnd: new Date("2026-08-02T22:00:00"), price: null, isFree: true, organizer: "CCBB Brasília", tags: ["mpb", "gratuito"], featured: true },
  { title: "Brasília Eletrônica Festival", description: "Line-up com DJs nacionais e internacionais em uma noite de música eletrônica.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745", locationName: "Estádio Mané Garrincha", locationAddress: "SRPN, Brasília - DF", dateStart: new Date("2026-09-05T22:00:00"), dateEnd: new Date("2026-09-06T05:00:00"), price: 180, isFree: false, organizer: "BSB Eletrônica", tags: ["eletrônica", "dj", "festa"], featured: true },
  { title: "Festival Gastronômico do Cerrado", description: "Chefs locais apresentam pratos autorais com ingredientes típicos do cerrado.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-07-25T11:00:00"), dateEnd: new Date("2026-07-27T22:00:00"), price: 30, isFree: false, organizer: "Sabores do Cerrado", tags: ["gastronomia", "food truck", "família"], featured: true },
  { title: "Festival de Música Independente de Brasília", description: "Três dias de música autoral com bandas emergentes do DF e entorno.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-08-14T16:00:00"), dateEnd: new Date("2026-08-16T23:00:00"), price: 40, isFree: false, organizer: "Coletivo Cerrado Sound", tags: ["música independente", "festival"], featured: false },
  { title: "Festival de Arte Urbana do DF", description: "Grafiteiros e artistas plásticos ocupam o espaço público com intervenções ao vivo.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8", locationName: "Complexo Cultural da República", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-09-19T10:00:00"), dateEnd: new Date("2026-09-20T18:00:00"), price: null, isFree: true, organizer: "Secretaria de Cultura do DF", tags: ["arte urbana", "grafite", "gratuito"], featured: false },
  { title: "Comédia Stand-up: Rir é o Melhor Remédio", description: "Uma noite de stand-up comedy com humoristas locais e nacionais.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260", locationName: "Teatro Nacional Cláudio Santoro", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-12T20:00:00"), dateEnd: new Date("2026-07-12T22:00:00"), price: 70, isFree: false, organizer: "Rir Produções", tags: ["comédia", "stand-up"], featured: false },
  { title: "Drama: A Última Carta", description: "Peça dramática premiada sobre memória e perda, com direção de Marina Alves.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35", locationName: "Teatro Nacional Cláudio Santoro", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-08-08T19:00:00"), dateEnd: new Date("2026-08-08T21:00:00"), price: 120, isFree: false, organizer: "Cia Teatral Alves", tags: ["drama", "premiada"], featured: true },
  { title: "Teatro Infantil: O Mundo Encantado", description: "Espetáculo infantil interativo com música e fantoches para toda a família.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b36", locationName: "Cine Brasília", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-10-12T16:00:00"), dateEnd: new Date("2026-10-12T17:30:00"), price: 25, isFree: false, organizer: "Trupe Encantada", tags: ["infantil", "família"], featured: false },
  { title: "Exposição: Brasília em Traços", description: "Mostra de desenhos e projetos arquitetônicos originais da construção de Brasília.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd", locationName: "Museu Nacional Honestino Guimarães", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-01T09:00:00"), dateEnd: new Date("2026-09-30T18:00:00"), price: null, isFree: true, organizer: "Museu Nacional", tags: ["arquitetura", "história", "gratuito"], featured: true },
  { title: "Fotografia: Olhares do Cerrado", description: "Exposição fotográfica sobre a fauna, flora e povos do cerrado brasileiro.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba", locationName: "CCBB Brasília", locationAddress: "SCES Trecho 2, Brasília - DF", dateStart: new Date("2026-08-20T09:00:00"), dateEnd: new Date("2026-11-20T18:00:00"), price: 20, isFree: false, organizer: "Coletivo Olhar Cerrado", tags: ["fotografia", "natureza"], featured: false },
  { title: "Arte Contemporânea do DF", description: "Curadoria de obras de artistas contemporâneos do Distrito Federal.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1531913764164-f85c52e6e654", locationName: "Conjunto Nacional", locationAddress: "SDS, Brasília - DF", dateStart: new Date("2026-11-05T10:00:00"), dateEnd: new Date("2026-12-20T20:00:00"), price: null, isFree: true, organizer: "Galeria DF Arte", tags: ["arte contemporânea", "gratuito"], featured: false },
  { title: "Mostra de Cinema Nacional", description: "Seleção de longas e curtas-metragens de diretores brasileiros contemporâneos.", category: "CINEMA", imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba", locationName: "Cine Brasília", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-09-10T18:00:00"), dateEnd: new Date("2026-09-15T22:00:00"), price: 15, isFree: false, organizer: "Cine Brasília", tags: ["cinema nacional", "mostra"], featured: false },
  { title: "Cine ao Ar Livre: Clássicos Brasileiros", description: "Sessão gratuita ao ar livre com clássicos do cinema brasileiro, pipoca inclusa.", category: "CINEMA", imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-10-24T19:00:00"), dateEnd: new Date("2026-10-24T22:00:00"), price: null, isFree: true, organizer: "Secretaria de Cultura do DF", tags: ["cinema", "ao ar livre", "gratuito"], featured: true },
  { title: "Festival de Inverno de Brasília", description: "Programação especial com shows, oficinas e gastronomia para celebrar o inverno no cerrado.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1522158637959-30385a09e0da", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-07-04T14:00:00"), dateEnd: new Date("2026-07-06T22:00:00"), price: 50, isFree: false, organizer: "Governo do DF", tags: ["inverno", "festival", "família"], featured: true },
];

async function main() {
  console.log("Seeding categories...");
  for (const category of categories) {
    await prisma.category.upsert({
      where: { value: category.value },
      update: category,
      create: category,
    });
  }

  console.log("Seeding events...");
  await prisma.event.deleteMany();
  for (const event of events) {
    await prisma.event.create({
      data: { ...event, tags: JSON.stringify(event.tags) },
    });
  }

  console.log("Seeding users...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("usuario123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bsbcult.com" },
    update: {},
    create: {
      name: "Admin BsbCult",
      email: "admin@bsbcult.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "usuario@bsbcult.com" },
    update: {},
    create: {
      name: "Usuário Teste",
      email: "usuario@bsbcult.com",
      passwordHash: userPassword,
      role: "USER",
    },
  });

  console.log("Seeding sample favorites...");
  const firstEvents = await prisma.event.findMany({ take: 3 });
  for (const event of firstEvents) {
    await prisma.favorite.upsert({
      where: { userId_eventId: { userId: user.id, eventId: event.id } },
      update: {},
      create: { userId: user.id, eventId: event.id },
    });
  }

  console.log(`Done. Admin: ${admin.email} / Usuário: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed script**

```bash
npm run db:seed
```

Expected: logs "Seeding categories...", "Seeding events...", "Seeding users...", "Seeding sample favorites...", ends with "Done. Admin: admin@bsbcult.com / Usuário: usuario@bsbcult.com".

- [ ] **Step 3: Verify row counts via Prisma Studio**

```bash
npm run db:studio
```

Expected: opens `http://localhost:5555`, `Category` table has 5 rows, `Event` has 16 rows, `User` has 2 rows, `Favorite` has 3 rows. Close Studio (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add seed script with categories, events, and users"
```

---

### Task 9: UI kit primitives

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/skeleton.tsx`

- [ ] **Step 1: Write `components/ui/button.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-dark",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-dark",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        ghost: "text-gray-600 hover:bg-gray-100",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 2: Write `components/ui/badge.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Badge({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white",
        className
      )}
      style={style}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Write `components/ui/card.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Write `components/ui/input.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 5: Write `components/ui/skeleton.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} {...props} />;
}
```

- [ ] **Step 6: Verify the project still compiles**

Run: `npx tsc --noEmit`
Expected: no errors related to the new files.

- [ ] **Step 7: Commit**

```bash
git add components/ui
git commit -m "feat: add UI kit primitives (button, badge, card, input, skeleton)"
```

---

### Task 10: CategoryBadge, EventCard, EmptyState components

**Files:**
- Create: `lib/category-icons.ts`, `components/events/category-badge.tsx`, `components/events/event-card.tsx`, `components/shared/empty-state.tsx`
- Test: `tests/components/event-card.test.tsx`

- [ ] **Step 1: Write `lib/category-icons.ts`**

```ts
import { Music, PartyPopper, Theater, ImageIcon, Film, Sparkles, type LucideIcon } from "lucide-react";
import type { Category, EventCategory } from "@prisma/client";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Music,
  PartyPopper,
  Theater,
  ImageIcon,
  Film,
  Sparkles,
};

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Sparkles;
}

export function categoryMap(categories: Category[]): Record<EventCategory, Category> {
  return Object.fromEntries(categories.map((c) => [c.value, c])) as Record<EventCategory, Category>;
}
```

`@prisma/client` is imported here only for its generated TypeScript types (`Category`, `EventCategory`), which are erased at compile time — this does not pull the Prisma runtime/client into the browser bundle, so it's safe for Client Components to import from this file.

- [ ] **Step 2: Write `components/events/category-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Category } from "@prisma/client";

export function CategoryBadge({ category }: { category: Pick<Category, "name" | "color" | "icon"> }) {
  const Icon = getCategoryIcon(category.icon);
  return (
    <Badge style={{ backgroundColor: category.color }}>
      <Icon className="h-3.5 w-3.5" />
      {category.name}
    </Badge>
  );
}
```

- [ ] **Step 3: Write the failing test for EventCard**

```tsx
// tests/components/event-card.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "@/components/events/event-card";

const category = { name: "Show", color: "#6366f1", icon: "Music" };

const baseEvent = {
  id: "1",
  title: "Rock na Concha",
  imageUrl: "https://example.com/img.jpg",
  locationName: "Concha Acústica",
  dateStart: new Date("2026-08-01T20:00:00"),
  price: 60,
  isFree: false,
};

describe("EventCard", () => {
  it("renders title, location, and formatted price", () => {
    render(<EventCard event={baseEvent} category={category} />);
    expect(screen.getByText("Rock na Concha")).toBeInTheDocument();
    expect(screen.getByText("Concha Acústica")).toBeInTheDocument();
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it("shows 'Gratuito' badge for free events", () => {
    render(<EventCard event={{ ...baseEvent, isFree: true, price: null }} category={category} />);
    expect(screen.getByText("Gratuito")).toBeInTheDocument();
  });

  it("links to the event detail page", () => {
    render(<EventCard event={baseEvent} category={category} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/eventos/1");
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run tests/components/event-card.test.tsx`
Expected: FAIL — `Cannot find module '@/components/events/event-card'`.

- [ ] **Step 5: Write `components/events/event-card.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatPrice, formatEventDate } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { Category } from "@prisma/client";

interface EventCardEvent {
  id: string;
  title: string;
  imageUrl: string;
  locationName: string;
  dateStart: Date;
  price: number | null;
  isFree: boolean;
}

export function EventCard({
  event,
  category,
}: {
  event: EventCardEvent;
  category: Pick<Category, "name" | "color" | "icon">;
}) {
  return (
    <Link href={`/eventos/${event.id}`}>
      <Card className="overflow-hidden">
        <div className="relative h-40 w-full">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" unoptimized />
          <div className="absolute left-3 top-3">
            <CategoryBadge category={category} />
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-1 font-semibold text-gray-900">{event.title}</h3>
          <p className="text-sm text-gray-500">{formatEventDate(event.dateStart)}</p>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.locationName}</span>
          </div>
          <p className={event.isFree ? "font-semibold text-primary" : "font-semibold text-gray-800"}>
            {formatPrice(event.price, event.isFree)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npx vitest run tests/components/event-card.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Write `components/shared/empty-state.tsx`**

```tsx
import { type LucideIcon, SearchX } from "lucide-react";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-gray-100 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="font-semibold text-gray-700">{title}</p>
      {description && <p className="max-w-xs text-sm text-gray-500">{description}</p>}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/category-icons.ts components/events components/shared tests/components
git commit -m "feat: add CategoryBadge, EventCard, and EmptyState components"
```

---

### Task 11: Header and BottomNav, wired into root layout

**Files:**
- Create: `components/layout/header.tsx`, `components/layout/bottom-nav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write `components/layout/header.tsx`**

```tsx
import Link from "next/link";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <span className="text-xl font-bold text-primary">BsbCult</span>
          <p className="hidden text-xs text-gray-500 sm:block">
            Seu guia definitivo para a vida cultural no Distrito Federal
          </p>
        </Link>
        <form action="/busca" className="hidden max-w-sm flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              placeholder="Buscar eventos, locais..."
              className="h-10 w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `components/layout/bottom-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Calendar, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/calendario", label: "Calendário", icon: Calendar },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/login", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white md:hidden">
      <div className="mx-auto flex max-w-5xl justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs",
                active ? "text-primary" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Wire both into `app/layout.tsx`**

Replace the `<body>` contents:

```tsx
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
// ...keep existing imports and metadata...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <Header />
        <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: header with "BsbCult" logo and search bar (desktop width), bottom nav with 5 icons visible on mobile width (resize browser to <768px to confirm).

- [ ] **Step 5: Commit**

```bash
git add components/layout app/layout.tsx
git commit -m "feat: add Header and BottomNav, wire into root layout"
```

---

### Task 12: Public API routes

**Files:**
- Create: `app/api/events/route.ts`, `app/api/categories/route.ts`
- Test: `tests/api/events.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/events.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/events/route";
import { NextRequest } from "next/server";

async function seedOne(overrides: Record<string, unknown> = {}) {
  return prisma.event.create({
    data: {
      title: "Show de Teste",
      description: "Descrição",
      category: "SHOW",
      imageUrl: "https://example.com/img.jpg",
      locationName: "Local Teste",
      locationAddress: "Endereço Teste",
      dateStart: new Date("2026-08-01T20:00:00"),
      dateEnd: new Date("2026-08-01T22:00:00"),
      price: 50,
      isFree: false,
      organizer: "Organizador",
      tags: JSON.stringify(["teste"]),
      featured: false,
      status: "ATIVO",
      ...overrides,
    },
  });
}

describe("GET /api/events", () => {
  it("returns all events when no filters are given", async () => {
    await seedOne();
    const res = await GET(new NextRequest("http://localhost/api/events"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("filters by category query param", async () => {
    await seedOne({ category: "SHOW" });
    await seedOne({ category: "TEATRO" });
    const res = await GET(new NextRequest("http://localhost/api/events?category=TEATRO"));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].category).toBe("TEATRO");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/api/events.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/events/route'`.

- [ ] **Step 3: Write `app/api/events/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/lib/services/events";
import type { EventCategory, EventStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const category = (params.get("category") as EventCategory | null) ?? undefined;
  const status = (params.get("status") as EventStatus | null) ?? undefined;
  const isFreeParam = params.get("isFree");
  const dateFromParam = params.get("dateFrom");
  const dateToParam = params.get("dateTo");

  const events = await listEvents({
    q,
    category: category ?? undefined,
    status: status ?? undefined,
    isFree: isFreeParam === null ? undefined : isFreeParam === "true",
    dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
    dateTo: dateToParam ? new Date(dateToParam) : undefined,
  });

  return NextResponse.json(events);
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/api/events.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write `app/api/categories/route.ts`**

```ts
import { NextResponse } from "next/server";
import { listCategories } from "@/lib/services/categories";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json(categories);
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api tests/api
git commit -m "feat: add public events and categories API routes"
```

---

### Task 13: Home page

**Files:**
- Create: `app/page.tsx`, `components/events/category-scroller.tsx`

- [ ] **Step 1: Write `components/events/category-scroller.tsx`**

```tsx
import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Category } from "@prisma/client";

export function CategoryScroller({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.icon);
        return (
          <Link
            key={category.id}
            href={`/busca?category=${category.value}`}
            className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm hover:shadow-md"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: category.color }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-gray-700">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `app/page.tsx`**

```tsx
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { getFeaturedEvents, listEvents } from "@/lib/services/events";
import { CategoryScroller } from "@/components/events/category-scroller";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function HomePage() {
  const [categories, featured, upcoming] = await Promise.all([
    listCategories(),
    getFeaturedEvents(),
    listEvents({ status: "ATIVO" }),
  ]);
  const categoriesByValue = categoryMap(categories);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categorias</h2>
        <CategoryScroller categories={categories} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Destaques da Semana</h2>
        {featured.length === 0 ? (
          <EmptyState title="Nenhum destaque no momento" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Próximos Eventos</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Nenhum evento programado" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: category chips row, "Destaques da Semana" with featured events, "Próximos Eventos" listing all active events, images loading from Unsplash.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/events/category-scroller.tsx
git commit -m "feat: build Home page with featured and upcoming events"
```

---

### Task 14: Busca (search) page

**Files:**
- Create: `app/busca/page.tsx`, `components/events/search-filters.tsx`

- [ ] **Step 1: Write `components/events/search-filters.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { Category } from "@prisma/client";

export function SearchFilters({ categories }: { categories: Category[] }) {
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
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `app/busca/page.tsx`**

```tsx
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { listEvents } from "@/lib/services/events";
import { SearchFilters } from "@/components/events/search-filters";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { EventCategory } from "@prisma/client";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; isFree?: string };
}) {
  const categories = await listCategories();
  const events = await listEvents({
    q: searchParams.q,
    category: (searchParams.category as EventCategory) || undefined,
    isFree: searchParams.isFree === undefined ? undefined : searchParams.isFree === "true",
    status: "ATIVO",
  });
  const categoriesByValue = categoryMap(categories);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Buscar Eventos</h1>
      <SearchFilters categories={categories} />
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

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/busca`.
Expected: all active events shown, typing in the search box filters results, selecting a category or "Gratuito" filters accordingly, empty state shows for a query with no matches (e.g. "xyz123").

- [ ] **Step 4: Commit**

```bash
git add app/busca components/events/search-filters.tsx
git commit -m "feat: build Busca page with live search and filters"
```

---

### Task 15: Event detail page

**Files:**
- Create: `app/eventos/[id]/page.tsx`, `app/eventos/[id]/not-found.tsx`, `components/events/share-button.tsx`

- [ ] **Step 1: Write `components/events/share-button.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      {copied ? "Link copiado!" : "Compartilhar"}
    </Button>
  );
}
```

- [ ] **Step 2: Write `app/eventos/[id]/not-found.tsx`**

```tsx
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarX } from "lucide-react";

export default function EventNotFound() {
  return <EmptyState icon={CalendarX} title="Evento não encontrado" />;
}
```

- [ ] **Step 3: Write `app/eventos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { getEventById, getRelatedEvents } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { CategoryBadge } from "@/components/events/category-badge";
import { EventCard } from "@/components/events/event-card";
import { ShareButton } from "@/components/events/share-button";
import { formatPrice, formatEventDate, parseTags } from "@/lib/utils";
import { MapPin } from "lucide-react";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  const [categories, related] = await Promise.all([
    listCategories(),
    getRelatedEvents(event),
  ]);
  const categoriesByValue = categoryMap(categories);
  const category = categoriesByValue[event.category];
  const tags = parseTags(event.tags);

  return (
    <div className="space-y-8">
      <div className="relative h-64 w-full overflow-hidden rounded-2xl sm:h-80">
        <Image src={event.imageUrl} alt={event.title} fill className="object-cover" unoptimized />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryBadge category={category} />
          <span className="text-sm text-gray-500">{formatEventDate(event.dateStart)}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="whitespace-pre-line text-gray-700">{event.description}</p>

        <div className="flex items-start gap-2 text-gray-700">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <p className="font-medium">{event.locationName}</p>
            <p className="text-sm text-gray-500">{event.locationAddress}</p>
          </div>
        </div>

        <p className={event.isFree ? "text-lg font-bold text-primary" : "text-lg font-bold text-gray-900"}>
          {formatPrice(event.price, event.isFree)}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <ShareButton title={event.title} />
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Eventos Relacionados</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <EventCard key={r.id} event={r} category={categoriesByValue[r.category]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, click any event card from the Home page.
Expected: full event detail with image, badge, description, location, price, tags, Compartilhar button (click it — should copy link and show "Link copiado!" for 2s), related events grid at the bottom. Visiting `/eventos/does-not-exist` shows the "Evento não encontrado" empty state.

- [ ] **Step 5: Commit**

```bash
git add app/eventos components/events/share-button.tsx
git commit -m "feat: build Event Detail page with share and related events"
```

---

### Task 16: Calendário page

**Files:**
- Create: `app/calendario/page.tsx`, `components/calendar/month-grid.tsx`

- [ ] **Step 1: Write `components/calendar/month-grid.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import { categoryMap } from "@/lib/category-icons";
import type { Category, EventCategory } from "@prisma/client";

interface CalendarEvent {
  id: string;
  title: string;
  imageUrl: string;
  locationName: string;
  dateStart: string;
  price: number | null;
  isFree: boolean;
  category: EventCategory;
}

export function MonthGrid({ categories }: { categories: Category[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const categoriesByValue = categoryMap(categories);

  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    const params = new URLSearchParams({
      dateFrom: gridStart.toISOString(),
      dateTo: gridEnd.toISOString(),
      status: "ATIVO",
    });
    fetch(`/api/events?${params.toString()}`)
      .then((res) => res.json())
      .then(setEvents);
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(new Date(event.dateStart), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-gray-900">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDay(new Date());
            }}
          >
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasEvents = eventsByDay.has(key);
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(day)}
              className={`flex h-12 flex-col items-center justify-center rounded-xl text-sm ${
                !isSameMonth(day, currentMonth) ? "text-gray-300" : "text-gray-700"
              } ${isSameDay(day, selectedDay) ? "bg-primary text-white" : "hover:bg-gray-100"} ${
                isToday(day) && !isSameDay(day, selectedDay) ? "font-bold text-primary" : ""
              }`}
            >
              {format(day, "d")}
              {hasEvents && <span className="h-1 w-1 rounded-full bg-secondary" />}
            </button>
          );
        })}
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Eventos em {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {selectedEvents.length === 0 ? (
          <EmptyState title="Nenhum evento neste dia" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{ ...event, dateStart: new Date(event.dateStart) }}
                category={categoriesByValue[event.category]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write `app/calendario/page.tsx`**

```tsx
import { listCategories } from "@/lib/services/categories";
import { MonthGrid } from "@/components/calendar/month-grid";

export default async function CalendarPage() {
  const categories = await listCategories();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Calendário de Eventos</h1>
      <MonthGrid categories={categories} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/calendario`.
Expected: current month grid, days with events show a small dot, clicking a day lists that day's events below, "Hoje" resets to the current month and selects today, navigating months (chevrons) fetches new events.

- [ ] **Step 4: Commit**

```bash
git add app/calendario components/calendar
git commit -m "feat: build Calendário page with month grid and day selection"
```

---

### Task 17: Loading states

**Files:**
- Create: `app/loading.tsx`, `app/busca/loading.tsx`, `app/calendario/loading.tsx`, `app/eventos/[id]/loading.tsx`, `components/events/event-grid-skeleton.tsx`

- [ ] **Step 1: Write `components/events/event-grid-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `app/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { EventGridSkeleton } from "@/components/events/event-grid-skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <section>
        <Skeleton className="mb-3 h-6 w-32" />
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-24 shrink-0" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="mb-3 h-6 w-48" />
        <EventGridSkeleton />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/busca/loading.tsx` and `app/calendario/loading.tsx`**

```tsx
// app/busca/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { EventGridSkeleton } from "@/components/events/event-grid-skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-11 w-full" />
      <EventGridSkeleton />
    </div>
  );
}
```

```tsx
// app/calendario/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 4: Write `app/eventos/[id]/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64 w-full sm:h-80" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`. Throttle the network (DevTools → Network → Slow 3G) and navigate to `/`, `/busca`, `/calendario`, and any `/eventos/[id]`.
Expected: a skeleton placeholder briefly appears before real content renders, matching each page's layout.

- [ ] **Step 6: Commit**

```bash
git add app/loading.tsx app/busca/loading.tsx app/calendario/loading.tsx app/eventos/[id]/loading.tsx components/events/event-grid-skeleton.tsx
git commit -m "feat: add skeleton loading states for Home, Busca, Calendário, and Event Detail"
```

---

### Task 18: README, env docs, and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# BsbCult

Seu guia definitivo para a vida cultural no Distrito Federal — descubra shows, festivais, peças de teatro e exposições em Brasília.

## Stack

Next.js 14 (App Router) · TypeScript · Prisma + SQLite · NextAuth.js · Tailwind CSS · Vitest

## Setup

\`\`\`bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
\`\`\`

Open http://localhost:3000.

## Credenciais de teste (seed)

- **Admin:** admin@bsbcult.com / admin123
- **Usuário:** usuario@bsbcult.com / usuario123

## Scripts

- \`npm run dev\` — inicia o servidor de desenvolvimento
- \`npm test\` — roda a suíte de testes (Vitest)
- \`npm run db:seed\` — repopula o banco com dados de exemplo
- \`npm run db:studio\` — abre o Prisma Studio

## Status

Fundação (banco de dados, Home, Busca, Calendário, Detalhe do Evento) implementada.
Autenticação, Favoritos e Painel Admin fazem parte de uma segunda fase de implementação.
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass (utils, services, components, API routes).

- [ ] **Step 3: Run a full build**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions and test credentials"
```

---

### Task 19: Create GitHub repository and push

**Files:** none (repo operations only)

- [ ] **Step 1: Confirm gh CLI auth**

```bash
gh auth status
```

Expected: logged in as `JarbasSPires`.

- [ ] **Step 2: Create the repository and push**

```bash
gh repo create JarbasSPires/bsbcult --public --source=. --remote=origin --push
```

Expected: repository created at `https://github.com/JarbasSPires/bsbcult`, all commits pushed to `main` (or `master`, matching local branch).

- [ ] **Step 3: Verify on GitHub**

```bash
gh repo view JarbasSPires/bsbcult --web
```

Expected: browser opens showing the pushed code and README.
