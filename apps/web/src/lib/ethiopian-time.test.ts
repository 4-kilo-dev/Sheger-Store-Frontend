import { describe, expect, it } from "vitest";
import {
  ethiopianSelectionToWesternHHmm,
  formatEthiopianTimeOfDay,
  westernToEthiopianTime,
} from "@vortex/utils";

describe("Ethiopian day-period mapping", () => {
  it("uses Lelit from midnight through 05:59", () => {
    expect(formatEthiopianTimeOfDay("00:00")).toBe("06:00 ለሊት");
    expect(formatEthiopianTimeOfDay("05:59")).toBe("11:59 ለሊት");
  });

  it("uses Tewat, Keseat, and Mata at their civil-day boundaries", () => {
    expect(formatEthiopianTimeOfDay("06:00")).toBe("12:00 ጠዋት");
    expect(formatEthiopianTimeOfDay("12:00")).toBe("06:00 ከሰዓት");
    expect(formatEthiopianTimeOfDay("18:00")).toBe("12:00 ማታ");
  });

  it("round-trips Ethiopian daytime and nighttime one o'clock", () => {
    expect(ethiopianSelectionToWesternHHmm("tewat", 1, 0)).toBe("07:00");
    expect(ethiopianSelectionToWesternHHmm("mata", 1, 0)).toBe("19:00");
    expect(westernToEthiopianTime(2, 0).period).toBe("lelit");
  });
});
