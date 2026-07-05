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
      {searchParams.get("reset") && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          Senha redefinida com sucesso! Faça login com a nova senha.
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
