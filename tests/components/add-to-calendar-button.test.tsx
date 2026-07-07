import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCalendarButton } from "@/components/events/add-to-calendar-button";

afterEach(cleanup);

const baseProps = {
  id: "evt-1",
  title: "Show de Rock",
  description: "Uma noite de rock autoral",
  locationName: "CCBB Brasília",
  locationAddress: "SCES Trecho 2",
  dateStart: new Date("2026-08-01T20:00:00Z"),
  dateEnd: new Date("2026-08-01T23:00:00Z"),
};

describe("AddToCalendarButton", () => {
  it("triggers a file download when clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<AddToCalendarButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /adicionar à agenda/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
  });
});
