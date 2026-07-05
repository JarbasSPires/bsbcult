import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const { getServerSessionMock } = vi.hoisted(() => ({ getServerSessionMock: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

import { POST } from "@/app/api/events/route";
import { PUT, DELETE } from "@/app/api/events/[id]/route";

const validPayload = {
  title: "Show Novo",
  description: "Uma descrição válida com mais de dez caracteres",
  category: "SHOW",
  imageUrl: "https://example.com/img.jpg",
  locationName: "Local",
  locationAddress: "Endereço",
  dateStart: new Date("2026-08-01T20:00:00").toISOString(),
  dateEnd: new Date("2026-08-01T22:00:00").toISOString(),
  price: 50,
  isFree: false,
  organizer: "Organizador",
  tags: ["show"],
  featured: false,
  status: "ATIVO",
};

beforeEach(() => {
  getServerSessionMock.mockReset();
});

describe("POST /api/events", () => {
  it("rejects requests without an admin session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(
      new NextRequest("http://localhost/api/events", { method: "POST", body: JSON.stringify(validPayload) })
    );
    expect(res.status).toBe(403);
  });

  it("creates an event for an admin session", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const res = await POST(
      new NextRequest("http://localhost/api/events", { method: "POST", body: JSON.stringify(validPayload) })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Show Novo");
  });
});

describe("PUT/DELETE /api/events/[id]", () => {
  it("updates and deletes an event as admin", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const created = await prisma.event.create({
      data: {
        title: "Original", description: "Descrição original com mais de dez caracteres", category: "SHOW",
        imageUrl: "https://example.com/i.jpg", locationName: "Local", locationAddress: "Endereço",
        dateStart: new Date(), dateEnd: new Date(), price: 10, isFree: false, organizer: "Org",
        tags: "[]", status: "ATIVO",
      },
    });

    const putRes = await PUT(
      new NextRequest(`http://localhost/api/events/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...validPayload, title: "Atualizado" }),
      }),
      { params: { id: created.id } }
    );
    expect(putRes.status).toBe(200);
    expect((await putRes.json()).title).toBe("Atualizado");

    const deleteRes = await DELETE(
      new NextRequest(`http://localhost/api/events/${created.id}`, { method: "DELETE" }),
      { params: { id: created.id } }
    );
    expect(deleteRes.status).toBe(200);

    const stillThere = await prisma.event.findUnique({ where: { id: created.id } });
    expect(stillThere).toBeNull();
  });
});
