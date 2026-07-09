import { describe, it, expect } from "vitest";
import { culturaDfAdapter } from "@/lib/scraper/adapters/cultura-df";

describe("culturaDfAdapter", () => {
  it("fails descriptively because the portal exposes no machine-readable events listing", async () => {
    // Escalation source: fetchEvents must reject with a descriptive error (which
    // runAdapter records in lastRunError), never fabricate events or crash.
    await expect(culturaDfAdapter.fetchEvents()).rejects.toThrow(
      /listagem legível por máquina de eventos culturais datados/i,
    );
  });
});
