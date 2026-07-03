import { EmptyState } from "@/components/shared/empty-state";
import { CalendarX } from "lucide-react";

export default function EventNotFound() {
  return <EmptyState icon={CalendarX} title="Evento não encontrado" />;
}
