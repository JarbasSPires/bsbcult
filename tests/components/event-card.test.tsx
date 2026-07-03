import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventCard } from "@/components/events/event-card";

afterEach(cleanup);

const category = { name: "Show", color: "#6366f1", icon: "Music" };

const baseEvent = {
  id: "1",
  title: "Rock na Concha",
  imageUrl: "https://example.com/img.jpg",
  locationName: "Concha Acústica",
  dateStart: new Date("2026-08-01T20:00:00"),
  price: 60,
  isFree: false,
};

describe("EventCard", () => {
  it("renders title, location, and formatted price", () => {
    render(<EventCard event={baseEvent} category={category} />);
    expect(screen.getByText("Rock na Concha")).toBeInTheDocument();
    expect(screen.getByText("Concha Acústica")).toBeInTheDocument();
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it("shows 'Gratuito' badge for free events", () => {
    render(<EventCard event={{ ...baseEvent, isFree: true, price: null }} category={category} />);
    expect(screen.getByText("Gratuito")).toBeInTheDocument();
  });

  it("links to the event detail page", () => {
    render(<EventCard event={baseEvent} category={category} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/eventos/1");
  });
});
