"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildIcsFile } from "@/lib/ics";

interface AddToCalendarButtonProps {
  id: string;
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
}

export function AddToCalendarButton(event: AddToCalendarButtonProps) {
  function handleClick() {
    const ics = buildIcsFile(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <CalendarPlus className="h-4 w-4" />
      Adicionar à Agenda
    </Button>
  );
}
