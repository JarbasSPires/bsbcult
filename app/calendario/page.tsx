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
