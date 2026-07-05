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
