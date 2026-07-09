import { describe, it, expect } from "vitest";
import { caixaCulturalAdapter } from "@/lib/scraper/adapters/caixa-cultural";

describe("caixaCulturalAdapter", () => {
  it("fails descriptively because the SharePoint site renders events client-side with gated REST", async () => {
    // Escalation source: fetchEvents must reject with a descriptive error (which
    // runAdapter records in lastRunError), never fabricate events or crash.
    await expect(caixaCulturalAdapter.fetchEvents()).rejects.toThrow(
      /listagem legível por máquina de eventos culturais datados/i,
    );
  });
});
