import { describe, expect, it } from "vitest";
import { formatArrangementLabel } from "./bookings.api";

describe("formatArrangementLabel", () => {
  it("normalizes a single width-by-height layout", () => {
    expect(formatArrangementLabel("2.5W x 2H")).toBe("(2.5wx2h)");
  });

  it("preserves every dimension in a multi-layout arrangement", () => {
    expect(formatArrangementLabel("(2.5Wx2H, 10Wx3H)")).toBe("(2.5wx2h, 10wx3h)");
  });

  it("preserves free-form arrangements that do not use width-by-height notation", () => {
    expect(formatArrangementLabel("2Hx3W(2PCS), 1x0.50(1PCS)")).toBe("2Hx3W(2PCS), 1x0.50(1PCS)");
  });
});
