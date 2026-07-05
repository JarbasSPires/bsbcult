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
