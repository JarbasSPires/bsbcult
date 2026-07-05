import Link from "next/link";
import { Search } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

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
        <form
          action="/busca"
          method="get"
          role="search"
          className="hidden max-w-sm flex-1 md:block"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              placeholder="Buscar eventos, locais..."
              aria-label="Buscar eventos, locais..."
              className="h-10 w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
        <UserMenu />
      </div>
    </header>
  );
}
