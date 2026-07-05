import { notFound } from "next/navigation";
import { getEventById } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { EventForm } from "@/components/admin/event-form";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const [event, categories] = await Promise.all([getEventById(params.id), listCategories()]);
  if (!event) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Editar Evento</h2>
      <EventForm event={event} categories={categories} />
    </div>
  );
}
