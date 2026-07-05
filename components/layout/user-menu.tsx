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
