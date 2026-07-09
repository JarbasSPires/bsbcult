import { describe, it, expect } from "vitest";
import { sescDfAdapter } from "@/lib/scraper/adapters/sesc-df";

describe("sescDfAdapter", () => {
  it("fails descriptively because the events agenda is JS-hydrated with no public listing", async () => {
    // Escalation source: fetchEvents must reject with a descriptive error (which
    // runAdapter records in lastRunError), never fabricate events or crash.
    await expect(sescDfAdapter.fetchEvents()).rejects.toThrow(
      /listagem legível por máquina de eventos culturais datados/i,
    );
  });
});
