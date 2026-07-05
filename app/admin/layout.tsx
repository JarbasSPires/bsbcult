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
