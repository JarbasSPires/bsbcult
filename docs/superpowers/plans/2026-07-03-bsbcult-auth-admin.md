# BsbCult — Auth, Favoritos & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authentication (NextAuth Credentials), password recovery, Favoritos, and a role-protected Admin panel (dashboard + CRUD for events/categories, read-only users) on top of the BsbCult foundation.

**Architecture:** NextAuth.js with JWT sessions and a Credentials provider backed by Prisma; `middleware.ts` enforces auth on `/favoritos` and role `ADMIN` on `/admin/**`; business logic lives in `lib/services/*` (already established pattern), API routes stay thin and call a shared `requireAdminSession()` guard for writes.

**Tech Stack:** NextAuth.js v4, bcryptjs, Zod, same Next.js/Prisma/Tailwind stack as the foundation plan.

**Prerequisite:** `docs/superpowers/plans/2026-07-03-bsbcult-foundation.md` must be fully implemented and committed first — this plan modifies several of its files (`app/layout.tsx`, `app/eventos/[id]/page.tsx`, `components/layout/bottom-nav.tsx`, `lib/services/events.ts`, `app/api/events/route.ts`).

**Spec:** `docs/superpowers/specs/2026-07-03-bsbcult-design.md`

---

### Task 1: NextAuth configuration

**Files:**
- Create: `lib/auth.ts`, `types/next-auth.d.ts`, `app/api/auth/[...nextauth]/route.ts`, `components/providers/session-provider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write `types/next-auth.d.ts`**

```ts
import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
    };
  }
  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
```

- [ ] **Step 2: Write `lib/auth.ts`**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
```

- [ ] **Step 3: Write `app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: Write `components/providers/session-provider.tsx`**

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 5: Wrap `app/layout.tsx` body with `AuthProvider`**

```tsx
import { AuthProvider } from "@/components/providers/session-provider";
// ...keep existing imports (Header, BottomNav, metadata, font)...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <AuthProvider>
          <Header />
          <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 md:pb-8">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify the dev server boots without errors**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: no console/terminal errors from NextAuth (a `NEXTAUTH_SECRET` warning would indicate `.env` isn't loaded — confirm it exists from the foundation plan).

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts types/next-auth.d.ts app/api/auth components/providers app/layout.tsx
git commit -m "feat: configure NextAuth with Credentials provider"
```

---

### Task 2: Route protection middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/favoritos"],
};
```

- [ ] **Step 2: Verify protection manually**

Run: `npm run dev`. Open `http://localhost:3000/favoritos` in an incognito window (no session).
Expected: redirected to `/login?callbackUrl=%2Ffavoritos`.
Open `http://localhost:3000/admin` while logged out.
Expected: redirected to `/login`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /favoritos and /admin routes with middleware"
```

---

### Task 3: Auth validation schemas and service (with tests)

**Files:**
- Create: `lib/validations.ts`, `lib/services/auth.ts`
- Test: `tests/lib/services/auth.test.ts`

- [ ] **Step 1: Write `lib/validations.ts`**

```ts
import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const eventSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().min(10, "Descrição muito curta"),
  category: z.enum(["SHOW", "FESTIVAL", "TEATRO", "EXPOSICAO", "CINEMA", "OUTRO"]),
  imageUrl: z.string().url("URL de imagem inválida"),
  locationName: z.string().min(2),
  locationAddress: z.string().min(2),
  dateStart: z.string().min(1),
  dateEnd: z.string().min(1),
  price: z.number().nullable(),
  isFree: z.boolean(),
  organizer: z.string().min(2),
  tags: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(["ATIVO", "ENCERRADO", "EM_BREVE"]),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  value: z.enum(["SHOW", "FESTIVAL", "TEATRO", "EXPOSICAO", "CINEMA", "OUTRO"]),
  icon: z.string().min(2),
  color: z.string().min(4),
  description: z.string().min(2),
});

export type EventInput = z.infer<typeof eventSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
```

- [ ] **Step 2: Write the failing test for the auth service**

```ts
// tests/lib/services/auth.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  registerUser,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/services/auth";
import bcrypt from "bcryptjs";

describe("registerUser", () => {
  it("creates a user with a hashed password and USER role", async () => {
    const user = await registerUser({ name: "Ana", email: "ana@example.com", password: "senha123" });
    expect(user.role).toBe("USER");
    expect(user.passwordHash).not.toBe("senha123");
    expect(await bcrypt.compare("senha123", user.passwordHash)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    await registerUser({ name: "Ana", email: "ana@example.com", password: "senha123" });
    await expect(
      registerUser({ name: "Outra Ana", email: "ana@example.com", password: "outrasenha" })
    ).rejects.toThrow("Este email já está cadastrado");
  });
});

describe("password reset flow", () => {
  it("generates a token and allows resetting the password", async () => {
    const user = await registerUser({ name: "Bia", email: "bia@example.com", password: "senhaAntiga" });

    const token = await createPasswordResetToken("bia@example.com");
    expect(token).toBeTruthy();

    await resetPasswordWithToken(token as string, "senhaNova123");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare("senhaNova123", updated!.passwordHash)).toBe(true);
  });

  it("returns null for an email that doesn't exist", async () => {
    const token = await createPasswordResetToken("naoexiste@example.com");
    expect(token).toBeNull();
  });

  it("rejects an expired token", async () => {
    const user = await registerUser({ name: "Caio", email: "caio@example.com", password: "senha123" });
    const expiredToken = await prisma.passwordResetToken.create({
      data: { token: "expired-token", userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(resetPasswordWithToken(expiredToken.token, "novaSenha")).rejects.toThrow(
      "Link de redefinição inválido ou expirado"
    );
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/services/auth'`.

- [ ] **Step 4: Write `lib/services/auth.ts`**

```ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerUser(data: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Este email já está cadastrado");

  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: "USER" },
  });
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new Error("Link de redefinição inválido ou expirado");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/auth.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/validations.ts lib/services/auth.ts tests/lib/services/auth.test.ts
git commit -m "feat: add auth service with registration and password reset"
```

---

### Task 4: Auth API routes

**Files:**
- Create: `app/api/auth/register/route.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Write `app/api/auth/register/route.ts`**

```ts
import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { registerUser } from "@/lib/services/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
```

- [ ] **Step 2: Write `app/api/auth/forgot-password/route.ts`**

```ts
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { createPasswordResetToken } from "@/lib/services/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const token = await createPasswordResetToken(parsed.data.email);
  // Modo dev: sem provedor de email configurado, retornamos o link diretamente
  // na resposta. Em produção, plugar um provedor (Resend/SendGrid) aqui e
  // parar de retornar o token no corpo da resposta.
  return NextResponse.json({ resetLink: token ? `/redefinir-senha?token=${token}` : null });
}
```

- [ ] **Step 3: Write `app/api/auth/reset-password/route.ts`**

```ts
import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations";
import { resetPasswordWithToken } from "@/lib/services/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/auth
git commit -m "feat: add register, forgot-password, and reset-password API routes"
```

---

### Task 5: Cadastro (register) page

**Files:**
- Create: `app/cadastro/page.tsx`

- [ ] **Step 1: Write `app/cadastro/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!acceptedTerms) {
      setErrors({ terms: ["Você precisa aceitar os termos"] });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setErrors(typeof data.error === "string" ? { form: [data.error] } : data.error);
      return;
    }
    router.push("/login?registered=true");
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <h1 className="text-xl font-bold text-gray-900">Criar conta</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {errors.name && <p className="text-sm text-red-600">{errors.name[0]}</p>}
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {errors.email && <p className="text-sm text-red-600">{errors.email[0]}</p>}
        <Input type="password" placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {errors.password && <p className="text-sm text-red-600">{errors.password[0]}</p>}
        <Input type="password" placeholder="Confirmar senha" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword[0]}</p>}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
          Aceito os termos de uso
        </label>
        {errors.terms && <p className="text-sm text-red-600">{errors.terms[0]}</p>}
        {errors.form && <p className="text-sm text-red-600">{errors.form[0]}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600">
        Já tenho conta?{" "}
        <Link href="/login" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/cadastro`. Fill the form with a new email and submit.
Expected: redirected to `/login?registered=true`. Submitting again with the same email shows "Este email já está cadastrado". Submitting without checking terms shows "Você precisa aceitar os termos".

- [ ] **Step 3: Commit**

```bash
git add app/cadastro
git commit -m "feat: build Cadastro (register) page"
```

---

### Task 6: Login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Write `app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Email ou senha incorretos");
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <h1 className="text-xl font-bold text-gray-900">Entrar</h1>
      {searchParams.get("registered") && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          Conta criada! Faça login para continuar.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/esqueci-senha" className="text-primary">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="text-primary">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/login`. Log in with `admin@bsbcult.com` / `admin123` (seeded in the foundation plan).
Expected: redirected to `/`, Header shows "Olá, Admin BsbCult" and an "Admin" link (built in Task 12).

- [ ] **Step 3: Commit**

```bash
git add app/login
git commit -m "feat: build Login page with NextAuth credentials sign-in"
```

---

### Task 7: Esqueci minha senha (forgot password) page

**Files:**
- Create: `app/esqueci-senha/page.tsx`

- [ ] **Step 1: Write `app/esqueci-senha/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setSent(true);
    setResetLink(data.resetLink ?? null);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <h1 className="text-xl font-bold text-gray-900">Esqueci minha senha</h1>
      {sent ? (
        <div className="space-y-3 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          <p>Se o email existir em nossa base, um link de redefinição foi gerado.</p>
          {resetLink && (
            <p>
              Modo de desenvolvimento — link direto:{" "}
              <Link href={resetLink} className="font-medium underline">
                {resetLink}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/esqueci-senha`, submit `usuario@bsbcult.com`.
Expected: confirmation message with a clickable dev-mode reset link.

- [ ] **Step 3: Commit**

```bash
git add app/esqueci-senha
git commit -m "feat: build Esqueci minha senha page"
```

---

### Task 8: Redefinir senha (reset password) page

**Files:**
- Create: `app/redefinir-senha/page.tsx`

- [ ] **Step 1: Write `app/redefinir-senha/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Não foi possível redefinir a senha");
      return;
    }
    router.push("/login?reset=true");
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <h1 className="text-xl font-bold text-gray-900">Redefinir senha</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="password" placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading ? "Redefinindo..." : "Redefinir senha"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify end-to-end**

Run through the full flow: `/esqueci-senha` → copy dev link → open it → set a new password → redirected to `/login?reset=true` → log in with the new password.
Expected: works end to end; an expired/invalid token shows "Link de redefinição inválido ou expirado".

- [ ] **Step 3: Commit**

```bash
git add app/redefinir-senha
git commit -m "feat: build Redefinir senha page"
```

---

### Task 9: Favorites service and API routes (with tests)

**Files:**
- Create: `lib/services/favorites.ts`, `app/api/favorites/route.ts`, `app/api/favorites/[eventId]/route.ts`
- Test: `tests/lib/services/favorites.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/services/favorites.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { listFavoritesForUser, addFavorite, removeFavorite, isFavorite } from "@/lib/services/favorites";

let userId: string;
let eventId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { name: "Dan", email: "dan@example.com", passwordHash: "x", role: "USER" },
  });
  const event = await prisma.event.create({
    data: {
      title: "Show Teste", description: "Desc", category: "SHOW", imageUrl: "https://example.com/i.jpg",
      locationName: "Local", locationAddress: "Endereço", dateStart: new Date(), dateEnd: new Date(),
      price: 10, isFree: false, organizer: "Org", tags: "[]", status: "ATIVO",
    },
  });
  userId = user.id;
  eventId = event.id;
});

describe("favorites", () => {
  it("adds and lists a favorite", async () => {
    await addFavorite(userId, eventId);
    const favorites = await listFavoritesForUser(userId);
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(eventId);
  });

  it("is idempotent when adding the same favorite twice", async () => {
    await addFavorite(userId, eventId);
    await addFavorite(userId, eventId);
    const favorites = await listFavoritesForUser(userId);
    expect(favorites).toHaveLength(1);
  });

  it("removes a favorite", async () => {
    await addFavorite(userId, eventId);
    await removeFavorite(userId, eventId);
    expect(await isFavorite(userId, eventId)).toBe(false);
  });

  it("reports isFavorite correctly", async () => {
    expect(await isFavorite(userId, eventId)).toBe(false);
    await addFavorite(userId, eventId);
    expect(await isFavorite(userId, eventId)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/favorites.test.ts`
Expected: FAIL — `Cannot find module '@/lib/services/favorites'`.

- [ ] **Step 3: Write `lib/services/favorites.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function listFavoritesForUser(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((f) => f.event);
}

export async function addFavorite(userId: string, eventId: string) {
  return prisma.favorite.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: {},
    create: { userId, eventId },
  });
}

export async function removeFavorite(userId: string, eventId: string) {
  await prisma.favorite.deleteMany({ where: { userId, eventId } });
}

export async function isFavorite(userId: string, eventId: string) {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  return !!favorite;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/favorites.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write `app/api/favorites/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFavoritesForUser, addFavorite } from "@/lib/services/favorites";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const events = await listFavoritesForUser(session.user.id);
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  await addFavorite(session.user.id, eventId);
  return NextResponse.json({ success: true }, { status: 201 });
}
```

- [ ] **Step 6: Write `app/api/favorites/[eventId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeFavorite } from "@/lib/services/favorites";

export async function DELETE(_request: Request, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await removeFavorite(session.user.id, params.eventId);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/services/favorites.ts app/api/favorites tests/lib/services/favorites.test.ts
git commit -m "feat: add favorites service and API routes"
```

---

### Task 10: FavoriteButton wired into Event Detail

**Files:**
- Create: `components/events/favorite-button.tsx`
- Modify: `app/eventos/[id]/page.tsx`

- [ ] **Step 1: Write `components/events/favorite-button.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({ eventId }: { eventId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((events: { id: string }[]) => setIsFavorite(events.some((e) => e.id === eventId)));
  }, [status, eventId]);

  async function toggleFavorite() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/eventos/${eventId}`);
      return;
    }
    setLoading(true);
    if (isFavorite) {
      await fetch(`/api/favorites/${eventId}`, { method: "DELETE" });
      setIsFavorite(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      setIsFavorite(true);
    }
    setLoading(false);
  }

  return (
    <Button variant={isFavorite ? "secondary" : "outline"} onClick={toggleFavorite} disabled={loading}>
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      {isFavorite ? "Favoritado" : "Adicionar aos Favoritos"}
    </Button>
  );
}
```

- [ ] **Step 2: Modify `app/eventos/[id]/page.tsx`**

Add the import:

```tsx
import { FavoriteButton } from "@/components/events/favorite-button";
```

Replace the buttons block:

```tsx
        <div className="flex gap-3">
          <FavoriteButton eventId={event.id} />
          <ShareButton title={event.title} />
        </div>
```

- [ ] **Step 3: Verify in the browser**

Logged out: open any event detail page, click "Adicionar aos Favoritos" → redirected to `/login?callbackUrl=/eventos/<id>`.
Logged in as `usuario@bsbcult.com` / `usuario123`: click the button → label changes to "Favoritado" and stays that way on page reload; click again → reverts to "Adicionar aos Favoritos".

- [ ] **Step 4: Commit**

```bash
git add components/events/favorite-button.tsx app/eventos/[id]/page.tsx
git commit -m "feat: add favorite toggle to Event Detail page"
```

---

### Task 11: Favoritos page

**Files:**
- Create: `app/favoritos/page.tsx`, `components/events/favorites-list.tsx`

- [ ] **Step 1: Write `components/events/favorites-list.tsx`**

```tsx
"use client";

import { useState } from "react";
import { HeartOff } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Category, Event, EventCategory } from "@prisma/client";

export function FavoritesList({
  initialEvents,
  categoriesByValue,
}: {
  initialEvents: Event[];
  categoriesByValue: Record<EventCategory, Category>;
}) {
  const [events, setEvents] = useState(initialEvents);

  async function handleRemove(eventId: string) {
    await fetch(`/api/favorites/${eventId}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={HeartOff}
        title="Você ainda não favoritou nenhum evento"
        description="Explore os eventos e toque no coração para salvá-los aqui."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <div key={event.id} className="space-y-2">
          <EventCard event={event} category={categoriesByValue[event.category]} />
          <Button variant="outline" size="sm" className="w-full" onClick={() => handleRemove(event.id)}>
            Remover dos Favoritos
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `app/favoritos/page.tsx`**

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFavoritesForUser } from "@/lib/services/favorites";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { FavoritesList } from "@/components/events/favorites-list";

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  const [categories, events] = await Promise.all([
    listCategories(),
    session ? listFavoritesForUser(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Meus Favoritos</h1>
      <FavoritesList initialEvents={events} categoriesByValue={categoryMap(categories)} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Logged in as `usuario@bsbcult.com`, open `/favoritos`.
Expected: the 3 events seeded as favorites appear; clicking "Remover dos Favoritos" removes the card immediately. A brand-new user with no favorites sees the "Você ainda não favoritou nenhum evento" empty state.

- [ ] **Step 4: Commit**

```bash
git add app/favoritos components/events/favorites-list.tsx
git commit -m "feat: build Favoritos page"
```

---

### Task 12: Session-aware Header and BottomNav

**Files:**
- Create: `components/layout/user-menu.tsx`
- Modify: `components/layout/header.tsx`, `components/layout/bottom-nav.tsx`

- [ ] **Step 1: Write `components/layout/user-menu.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Link href="/login" className="hidden text-sm font-medium text-primary md:block">
        Entrar
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-3 md:flex">
      {session.user.role === "ADMIN" && (
        <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-primary">
          Admin
        </Link>
      )}
      <span className="text-sm text-gray-600">Olá, {session.user.name}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm font-medium text-gray-500 hover:text-primary"
      >
        Sair
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Modify `components/layout/header.tsx`**

Add the import and render `<UserMenu />` next to the search form:

```tsx
import { UserMenu } from "@/components/layout/user-menu";
// ...
        <form action="/busca" className="hidden max-w-sm flex-1 md:block">
          {/* ...unchanged... */}
        </form>
        <UserMenu />
```

- [ ] **Step 3: Modify `components/layout/bottom-nav.tsx`**

Replace the file contents:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, Search, Calendar, Heart, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/calendario", label: "Calendário", icon: Calendar },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white md:hidden">
      <div className="mx-auto flex max-w-5xl justify-around px-2 py-2">
        {baseItems.map(({ href, label, icon: Icon }) => {
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
        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex flex-col items-center gap-1 px-3 py-1 text-xs text-gray-500"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs",
              pathname === "/login" ? "text-primary" : "text-gray-500"
            )}
          >
            <User className="h-5 w-5" />
            Perfil
          </Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Logged out: Header shows "Entrar", BottomNav's last item is "Perfil" linking to `/login`.
Logged in as admin: Header shows "Admin" link + "Olá, Admin BsbCult" + "Sair"; BottomNav's last item becomes a "Sair" button that logs out on click.

- [ ] **Step 5: Commit**

```bash
git add components/layout
git commit -m "feat: make Header and BottomNav session-aware"
```

---

### Task 13: Admin guard and Events CRUD service/API

**Files:**
- Create: `lib/admin-guard.ts`
- Modify: `lib/services/events.ts`, `app/api/events/route.ts`
- Create: `app/api/events/[id]/route.ts`
- Test: `tests/api/events-admin.test.ts`

- [ ] **Step 1: Write `lib/admin-guard.ts`**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}
```

- [ ] **Step 2: Append CRUD functions to `lib/services/events.ts`**

Add below the existing exports:

```ts
export interface EventInput {
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
  featured: boolean;
  status: EventStatus;
}

export async function createEvent(data: EventInput): Promise<Event> {
  return prisma.event.create({ data: { ...data, tags: JSON.stringify(data.tags) } });
}

export async function updateEvent(id: string, data: EventInput): Promise<Event> {
  return prisma.event.update({ where: { id }, data: { ...data, tags: JSON.stringify(data.tags) } });
}

export async function deleteEvent(id: string): Promise<void> {
  await prisma.event.delete({ where: { id } });
}
```

- [ ] **Step 3: Write the failing test for the admin API routes**

```ts
// tests/api/events-admin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const { getServerSessionMock } = vi.hoisted(() => ({ getServerSessionMock: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

import { POST } from "@/app/api/events/route";
import { PUT, DELETE } from "@/app/api/events/[id]/route";

const validPayload = {
  title: "Show Novo",
  description: "Uma descrição válida com mais de dez caracteres",
  category: "SHOW",
  imageUrl: "https://example.com/img.jpg",
  locationName: "Local",
  locationAddress: "Endereço",
  dateStart: new Date("2026-08-01T20:00:00").toISOString(),
  dateEnd: new Date("2026-08-01T22:00:00").toISOString(),
  price: 50,
  isFree: false,
  organizer: "Organizador",
  tags: ["show"],
  featured: false,
  status: "ATIVO",
};

beforeEach(() => {
  getServerSessionMock.mockReset();
});

describe("POST /api/events", () => {
  it("rejects requests without an admin session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(
      new NextRequest("http://localhost/api/events", { method: "POST", body: JSON.stringify(validPayload) })
    );
    expect(res.status).toBe(403);
  });

  it("creates an event for an admin session", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const res = await POST(
      new NextRequest("http://localhost/api/events", { method: "POST", body: JSON.stringify(validPayload) })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Show Novo");
  });
});

describe("PUT/DELETE /api/events/[id]", () => {
  it("updates and deletes an event as admin", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const created = await prisma.event.create({
      data: {
        title: "Original", description: "Descrição original com mais de dez caracteres", category: "SHOW",
        imageUrl: "https://example.com/i.jpg", locationName: "Local", locationAddress: "Endereço",
        dateStart: new Date(), dateEnd: new Date(), price: 10, isFree: false, organizer: "Org",
        tags: "[]", status: "ATIVO",
      },
    });

    const putRes = await PUT(
      new NextRequest(`http://localhost/api/events/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...validPayload, title: "Atualizado" }),
      }),
      { params: { id: created.id } }
    );
    expect(putRes.status).toBe(200);
    expect((await putRes.json()).title).toBe("Atualizado");

    const deleteRes = await DELETE(
      new NextRequest(`http://localhost/api/events/${created.id}`, { method: "DELETE" }),
      { params: { id: created.id } }
    );
    expect(deleteRes.status).toBe(200);

    const stillThere = await prisma.event.findUnique({ where: { id: created.id } });
    expect(stillThere).toBeNull();
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run tests/api/events-admin.test.ts`
Expected: FAIL — `POST` export from `app/api/events/route.ts` doesn't exist yet, `app/api/events/[id]/route.ts` doesn't exist.

- [ ] **Step 5: Append `POST` to `app/api/events/route.ts`**

Add these imports at the top and the handler at the bottom of the existing file:

```ts
import { requireAdminSession } from "@/lib/admin-guard";
import { eventSchema } from "@/lib/validations";
import { createEvent } from "@/lib/services/events";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const event = await createEvent({
    ...parsed.data,
    dateStart: new Date(parsed.data.dateStart),
    dateEnd: new Date(parsed.data.dateEnd),
  });
  return NextResponse.json(event, { status: 201 });
}
```

- [ ] **Step 6: Write `app/api/events/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { eventSchema } from "@/lib/validations";
import { getEventById, updateEvent, deleteEvent } from "@/lib/services/events";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const event = await updateEvent(params.id, {
    ...parsed.data,
    dateStart: new Date(parsed.data.dateStart),
    dateEnd: new Date(parsed.data.dateEnd),
  });
  return NextResponse.json(event);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await deleteEvent(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npx vitest run tests/api/events-admin.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
git add lib/admin-guard.ts lib/services/events.ts app/api/events tests/api/events-admin.test.ts
git commit -m "feat: add admin-guarded create/update/delete for events"
```

---

### Task 14: Admin layout, nav, and dashboard

**Files:**
- Create: `components/admin/admin-nav.tsx`, `app/admin/layout.tsx`, `lib/services/admin.ts`, `app/admin/page.tsx`

- [ ] **Step 1: Write `components/admin/admin-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-gray-100 pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "shrink-0 rounded-xl px-4 py-2 text-sm font-medium",
            pathname === link.href ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Write `app/admin/layout.tsx`**

```tsx
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
      <AdminNav />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write `lib/services/admin.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics() {
  const [totalEvents, activeEvents, totalUsers, totalFavorites] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: "ATIVO" } }),
    prisma.user.count(),
    prisma.favorite.count(),
  ]);
  return { totalEvents, activeEvents, totalUsers, totalFavorites };
}
```

- [ ] **Step 4: Write `app/admin/page.tsx`**

```tsx
import { getDashboardMetrics } from "@/lib/services/admin";

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  const cards = [
    { label: "Total de Eventos", value: metrics.totalEvents },
    { label: "Eventos Ativos", value: metrics.activeEvents },
    { label: "Usuários Cadastrados", value: metrics.totalUsers },
    { label: "Favoritos Registrados", value: metrics.totalFavorites },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-primary">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Logged in as `admin@bsbcult.com`, open `/admin`.
Expected: nav tabs (Dashboard, Eventos, Categorias, Usuários), 4 metric cards with correct counts (16 events, matching active count, 2 users, 3 favorites from the seed).

- [ ] **Step 6: Commit**

```bash
git add components/admin/admin-nav.tsx app/admin/layout.tsx app/admin/page.tsx lib/services/admin.ts
git commit -m "feat: build Admin layout, nav, and dashboard metrics"
```

---

### Task 15: Admin Events pages (list, create, edit)

**Files:**
- Create: `components/admin/event-form.tsx`, `components/admin/events-table.tsx`, `app/admin/eventos/page.tsx`, `app/admin/eventos/novo/page.tsx`, `app/admin/eventos/[id]/editar/page.tsx`

- [ ] **Step 1: Write `components/admin/event-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseTags } from "@/lib/utils";
import type { Category, Event } from "@prisma/client";

interface FormValues {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: string;
  dateEnd: string;
  price: string;
  isFree: boolean;
  organizer: string;
  tags: string;
  featured: boolean;
  status: string;
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toFormValues(event?: Event): FormValues {
  if (!event) {
    return {
      title: "", description: "", category: "SHOW", imageUrl: "", locationName: "",
      locationAddress: "", dateStart: "", dateEnd: "", price: "", isFree: false,
      organizer: "", tags: "", featured: false, status: "ATIVO",
    };
  }
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    dateStart: toDatetimeLocal(new Date(event.dateStart)),
    dateEnd: toDatetimeLocal(new Date(event.dateEnd)),
    price: event.price?.toString() ?? "",
    isFree: event.isFree,
    organizer: event.organizer,
    tags: parseTags(event.tags).join(", "),
    featured: event.featured,
    status: event.status,
  };
}

export function EventForm({ event, categories }: { event?: Event; categories: Category[] }) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(toFormValues(event));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title: values.title,
      description: values.description,
      category: values.category,
      imageUrl: values.imageUrl,
      locationName: values.locationName,
      locationAddress: values.locationAddress,
      dateStart: new Date(values.dateStart).toISOString(),
      dateEnd: new Date(values.dateEnd).toISOString(),
      price: values.isFree || !values.price ? null : Number(values.price),
      isFree: values.isFree,
      organizer: values.organizer,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      featured: values.featured,
      status: values.status,
    };

    const res = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
      method: event ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível salvar o evento. Confira os campos obrigatórios.");
      return;
    }
    router.push("/admin/eventos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <Input placeholder="Título" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} required />
      <textarea
        placeholder="Descrição"
        className="h-28 w-full rounded-xl border border-gray-300 p-3 text-sm"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <select
          className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
          value={values.status}
          onChange={(e) => setValues({ ...values, status: e.target.value })}
        >
          <option value="ATIVO">Ativo</option>
          <option value="EM_BREVE">Em breve</option>
          <option value="ENCERRADO">Encerrado</option>
        </select>
      </div>
      <Input placeholder="URL da imagem" value={values.imageUrl} onChange={(e) => setValues({ ...values, imageUrl: e.target.value })} required />
      <div className="grid grid-cols-2 gap-4">
        <Input placeholder="Nome do local" value={values.locationName} onChange={(e) => setValues({ ...values, locationName: e.target.value })} required />
        <Input placeholder="Endereço" value={values.locationAddress} onChange={(e) => setValues({ ...values, locationAddress: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Início
          <input
            type="datetime-local"
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            value={values.dateStart}
            onChange={(e) => setValues({ ...values, dateStart: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Fim
          <input
            type="datetime-local"
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            value={values.dateEnd}
            onChange={(e) => setValues({ ...values, dateEnd: e.target.value })}
            required
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="Preço (R$)"
          type="number"
          value={values.price}
          disabled={values.isFree}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
        />
        <Input placeholder="Organizador" value={values.organizer} onChange={(e) => setValues({ ...values, organizer: e.target.value })} required />
      </div>
      <Input placeholder="Tags (separadas por vírgula)" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} />
      <div className="flex gap-6 text-sm text-gray-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={values.isFree} onChange={(e) => setValues({ ...values, isFree: e.target.checked })} />
          Gratuito
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={values.featured} onChange={(e) => setValues({ ...values, featured: e.target.checked })} />
          Destaque
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : event ? "Salvar alterações" : "Criar evento"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `components/admin/events-table.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatPrice } from "@/lib/utils";
import type { Category, Event, EventCategory } from "@prisma/client";

export function EventsTable({
  events,
  categoriesByValue,
}: {
  events: Event[];
  categoriesByValue: Record<EventCategory, Category>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(events);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Título</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Data</th>
            <th className="p-3">Preço</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((event) => (
            <tr key={event.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{event.title}</td>
              <td className="p-3">{categoriesByValue[event.category]?.name}</td>
              <td className="p-3">{formatEventDate(new Date(event.dateStart))}</td>
              <td className="p-3">{formatPrice(event.price, event.isFree)}</td>
              <td className="p-3">{event.status}</td>
              <td className="flex gap-2 p-3">
                <Link href={`/admin/eventos/${event.id}/editar`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                  Excluir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/admin/eventos/page.tsx`**

```tsx
import Link from "next/link";
import { listEvents } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { EventsTable } from "@/components/admin/events-table";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage() {
  const [events, categories] = await Promise.all([listEvents({}), listCategories()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Eventos</h2>
        <Link href="/admin/eventos/novo">
          <Button>Novo Evento</Button>
        </Link>
      </div>
      <EventsTable events={events} categoriesByValue={categoryMap(categories)} />
    </div>
  );
}
```

- [ ] **Step 4: Write `app/admin/eventos/novo/page.tsx`**

```tsx
import { listCategories } from "@/lib/services/categories";
import { EventForm } from "@/components/admin/event-form";

export default async function NewEventPage() {
  const categories = await listCategories();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Novo Evento</h2>
      <EventForm categories={categories} />
    </div>
  );
}
```

- [ ] **Step 5: Write `app/admin/eventos/[id]/editar/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { EventForm } from "@/components/admin/event-form";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const [event, categories] = await Promise.all([getEventById(params.id), listCategories()]);
  if (!event) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Editar Evento</h2>
      <EventForm event={event} categories={categories} />
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Logged in as admin, open `/admin/eventos`.
Expected: table lists all 16 seeded events; "Novo Evento" opens a blank form that creates a new event and redirects back to the list; "Editar" pre-fills the form and saves changes; "Excluir" (after confirming) removes the row.

- [ ] **Step 7: Commit**

```bash
git add components/admin/event-form.tsx components/admin/events-table.tsx app/admin/eventos
git commit -m "feat: build Admin Events CRUD pages"
```

---

### Task 16: Admin Categories CRUD

**Files:**
- Modify: `lib/services/categories.ts`
- Create: `app/api/categories/[id]/route.ts`, `components/admin/category-form.tsx`, `components/admin/categories-table.tsx`, `app/admin/categorias/page.tsx`, `app/admin/categorias/nova/page.tsx`, `app/admin/categorias/[id]/editar/page.tsx`
- Modify: `app/api/categories/route.ts`

- [ ] **Step 1: Append CRUD functions to `lib/services/categories.ts`**

```ts
import type { CategoryInput } from "@/lib/validations";

export async function createCategory(data: CategoryInput) {
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, data: CategoryInput) {
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
}
```

- [ ] **Step 2: Append `POST` to `app/api/categories/route.ts`**

```ts
import { requireAdminSession } from "@/lib/admin-guard";
import { categorySchema } from "@/lib/validations";
import { createCategory } from "@/lib/services/categories";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const category = await createCategory(parsed.data);
  return NextResponse.json(category, { status: 201 });
}
```

- [ ] **Step 3: Write `app/api/categories/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { categorySchema } from "@/lib/validations";
import { updateCategory, deleteCategory } from "@/lib/services/categories";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const category = await updateCategory(params.id, parsed.data);
  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await deleteCategory(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Write `components/admin/category-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "@prisma/client";

const CATEGORY_VALUES = ["SHOW", "FESTIVAL", "TEATRO", "EXPOSICAO", "CINEMA", "OUTRO"] as const;

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: category?.name ?? "",
    value: category?.value ?? "SHOW",
    icon: category?.icon ?? "Sparkles",
    color: category?.color ?? "#6366f1",
    description: category?.description ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
      method: category ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível salvar a categoria.");
      return;
    }
    router.push("/admin/categorias");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Input placeholder="Nome" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
      <select
        className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
        value={values.value}
        onChange={(e) => setValues({ ...values, value: e.target.value as (typeof CATEGORY_VALUES)[number] })}
      >
        {CATEGORY_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <Input placeholder="Ícone (nome lucide-react, ex: Music)" value={values.icon} onChange={(e) => setValues({ ...values, icon: e.target.value })} required />
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={values.color}
          onChange={(e) => setValues({ ...values, color: e.target.value })}
          className="h-11 w-14 rounded-xl border border-gray-300"
        />
        <Input placeholder="Cor (hex)" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} required />
      </div>
      <textarea
        placeholder="Descrição"
        className="h-24 w-full rounded-xl border border-gray-300 p-3 text-sm"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : category ? "Salvar alterações" : "Criar categoria"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Write `components/admin/categories-table.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Category } from "@prisma/client";

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Cor</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((category) => (
            <tr key={category.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{category.name}</td>
              <td className="p-3">{category.value}</td>
              <td className="p-3">
                <span className="inline-block h-4 w-4 rounded-full align-middle" style={{ backgroundColor: category.color }} />{" "}
                {category.color}
              </td>
              <td className="flex gap-2 p-3">
                <Link href={`/admin/categorias/${category.id}/editar`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                  Excluir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Write `app/admin/categorias/page.tsx`**

```tsx
import Link from "next/link";
import { listCategories } from "@/lib/services/categories";
import { CategoriesTable } from "@/components/admin/categories-table";
import { Button } from "@/components/ui/button";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Categorias</h2>
        <Link href="/admin/categorias/nova">
          <Button>Nova Categoria</Button>
        </Link>
      </div>
      <CategoriesTable categories={categories} />
    </div>
  );
}
```

- [ ] **Step 7: Write `app/admin/categorias/nova/page.tsx`**

```tsx
import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Nova Categoria</h2>
      <CategoryForm />
    </div>
  );
}
```

- [ ] **Step 8: Write `app/admin/categorias/[id]/editar/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Editar Categoria</h2>
      <CategoryForm category={category} />
    </div>
  );
}
```

- [ ] **Step 9: Verify in the browser**

Logged in as admin, open `/admin/categorias`.
Expected: table with the 5 seeded categories; create/edit/delete all work the same way as Events.

- [ ] **Step 10: Commit**

```bash
git add lib/services/categories.ts app/api/categories components/admin/category-form.tsx components/admin/categories-table.tsx app/admin/categorias
git commit -m "feat: build Admin Categories CRUD pages"
```

---

### Task 17: Admin Users list

**Files:**
- Create: `lib/services/users.ts`, `app/api/users/route.ts`, `app/admin/usuarios/page.tsx`

- [ ] **Step 1: Write `lib/services/users.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { favorites: true } },
    },
  });
}
```

- [ ] **Step 2: Write `app/api/users/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { listUsers } from "@/lib/services/users";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json(users);
}
```

- [ ] **Step 3: Write `app/admin/usuarios/page.tsx`**

```tsx
import { listUsers } from "@/lib/services/users";
import { formatEventDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Email</th>
            <th className="p-3">Função</th>
            <th className="p-3">Favoritos</th>
            <th className="p-3">Cadastrado em</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{user.name}</td>
              <td className="p-3">{user.email}</td>
              <td className="p-3">{user.role}</td>
              <td className="p-3">{user._count.favorites}</td>
              <td className="p-3">{formatEventDate(new Date(user.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Logged in as admin, open `/admin/usuarios`.
Expected: table with the 2 seeded users, correct roles, and favorite counts (3 for `usuario@bsbcult.com`, 0 for the admin).

- [ ] **Step 5: Commit**

```bash
git add lib/services/users.ts app/api/users app/admin/usuarios
git commit -m "feat: build Admin Users list page"
```

---

### Task 18: Final verification, README update, and push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the "Status" section of `README.md`**

Replace the final section:

```markdown
## Status

Aplicação completa: navegação pública (Home, Busca, Calendário, Detalhe do Evento),
autenticação (Cadastro, Login, Esqueci/Redefinir senha), Favoritos, e Painel
Administrativo (Dashboard, CRUD de Eventos e Categorias, listagem de Usuários).
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass across both plans (utils, services, components, API routes, auth, favorites, admin CRUD).

- [ ] **Step 3: Run a full production build**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 4: Manual smoke test of all 4 navigation flows from the spec**

1. Descoberta: Home → categoria → Busca filtrada → evento → Detalhe → favoritar.
2. Busca: Busca → termo → filtros → evento → Detalhe.
3. Calendário: Calendário → navegar mês → clicar dia → ver eventos → selecionar um.
4. Favoritos: Favoritos (deslogado → redireciona para Login) → logar → ver lista.

Expected: all four flows work without console errors.

- [ ] **Step 5: Commit and push**

```bash
git add README.md
git commit -m "docs: update README status for completed auth and admin features"
git push origin HEAD
```

Expected: `https://github.com/JarbasSPires/bsbcult` reflects the full, working BsbCult app.
