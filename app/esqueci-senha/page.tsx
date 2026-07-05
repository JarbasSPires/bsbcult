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
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError("Não foi possível processar o pedido. Confira o email informado.");
        return;
      }
      setLoading(false);
      setSent(true);
      setResetLink(data.resetLink ?? null);
    } catch {
      setLoading(false);
      setError("Erro de conexão. Tente novamente.");
    }
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
      )}
    </div>
  );
}
