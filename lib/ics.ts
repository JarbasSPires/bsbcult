interface IcsEventInput {
  id: string;
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsFile(event: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BsbCult//Guia Cultural de Brasilia//PT",
    "BEGIN:VEVENT",
    `UID:${event.id}@bsbcult.com.br`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.dateStart)}`,
    `DTEND:${toIcsDate(event.dateEnd)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(`${event.locationName}, ${event.locationAddress}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
