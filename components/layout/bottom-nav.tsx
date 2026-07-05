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
                "flex flex-col items-center gap-1 px-3 py-2 text-xs",
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
            className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-gray-500"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 text-xs",
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
