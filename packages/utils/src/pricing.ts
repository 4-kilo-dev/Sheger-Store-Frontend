/**
 * Confirm-booking pricing: total = screen area (sqm) × daily rate × rented days.
 * Shared by web and mobile so money never diverges across clients.
 */

export type ConfirmPricingInput = {
  screenSize: number;
  dailyRate: number;
  rentedDays: number;
};

export type ConfirmPricingResult = {
  total: number;
  isValid: boolean;
  errors: string[];
};

/**
 * Compute the confirmed contract total and validate the same gates Web uses
 * before recording payment / transitioning to CONFIRMED.
 */
export function computeConfirmPricing(input: ConfirmPricingInput): ConfirmPricingResult {
  const screenSize = Number(input.screenSize);
  const dailyRate = Number(input.dailyRate);
  const rentedDays = Number(input.rentedDays);
  const errors: string[] = [];

  if (!Number.isFinite(screenSize) || screenSize <= 0) {
    errors.push("Screen size (sqm) is required before confirming.");
  }
  if (!Number.isFinite(rentedDays) || rentedDays <= 0) {
    errors.push("This booking has no number of days set — update the booking schedule first.");
  }
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    errors.push("Daily rate is required.");
  }

  const total =
    Number.isFinite(screenSize) &&
    screenSize > 0 &&
    Number.isFinite(dailyRate) &&
    dailyRate > 0 &&
    Number.isFinite(rentedDays) &&
    rentedDays > 0
      ? screenSize * dailyRate * rentedDays
      : 0;

  if (errors.length === 0 && total < 1000) {
    errors.push("Computed total must be at least 1,000.");
  }

  return { total, isValid: errors.length === 0, errors };
}
