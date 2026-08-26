/** Inventory category key → BOM line prefix (booking-scoped sequence). */
const CATEGORY_PREFIX: Record<string, string> = {
  screen: "SC",
  controller: "CR",
  cable: "CB",
  cable_p29: "CB",
  cable_p39_in: "CB",
  cable_p39_out: "CB",
  cable_p5: "CB",
  cable_3phase: "PW",
  power_box: "PW",
  stage_truss: "TR",
  stand: "ST",
  weight: "WT",
  hanging_bar: "HB",
  accessories: "AC",
  flight_case: "FC",
  laptop: "LP",
  other: "OT",
};

function inferPrefixFromName(name: string): string {
  const n = name.toLowerCase();
  if (/p\d[\d.]|\boutdoor\b|\bindoor\b|\bpanel\b|\bscreen\b|sqm|m²/.test(n)) return "SC";
  if (/\bpower\b|psu|3phase|3-phase|power box/.test(n)) return "PW";
  if (/\bdata\b|\bcable\b|cat6|hdmi|fiber|usb/.test(n)) return "CB";
  if (/truss|rigging|hanging bar/.test(n)) return "TR";
  if (/controller|novastar|processor|\bvx\b|tessera/.test(n)) return "CR";
  if (/stand|stnd/.test(n)) return "ST";
  if (/weight|\bwt\b/.test(n)) return "WT";
  if (/flight case|case/.test(n)) return "FC";
  return "BL";
}

function resolvePrefix(categoryKey: string | undefined, itemName: string): string {
  const key = (categoryKey || "").trim();
  const name = itemName.trim();

  if (key.startsWith("cable") && /\bpower\b|3phase|3-phase/.test(name.toLowerCase())) {
    return "PW";
  }

  if (key && CATEGORY_PREFIX[key]) {
    return CATEGORY_PREFIX[key];
  }

  return inferPrefixFromName(name);
}

export interface BomLineCodeInput {
  id: string;
  name: string;
  categoryKey?: string;
}

/** Assign display codes like SC-001, CB-002 per material type within one booking. */
export function assignBomLineCodes<T extends BomLineCodeInput>(
  lines: T[],
): (T & { code: string })[] {
  const counters: Record<string, number> = {};

  return lines.map((line) => {
    const prefix = resolvePrefix(line.categoryKey, line.name);
    counters[prefix] = (counters[prefix] || 0) + 1;
    const seq = String(counters[prefix]).padStart(3, "0");
    return { ...line, code: `${prefix}-${seq}` };
  });
}
