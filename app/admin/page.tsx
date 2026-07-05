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
