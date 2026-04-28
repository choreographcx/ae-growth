/**
 * Money conversion helpers.
 *
 * DB invariant: `cost` and `cost_usd` from `bq_fdw.aesa_dashboard_daily` are
 * always denominated in USD, regardless of which currency each ad platform's
 * API natively reports in. The per-platform "reporting currency" stored in
 * Admin → Platform Settings is informational metadata only — it documents
 * what the source platform bills in but does not drive any conversion.
 *
 * Conversion is therefore a single step driven solely by the client-level
 * reporting currency: multiply USD values by the client's USD→SAR or USD→AED
 * rate. USD reporting (or any unrecognised currency) returns a multiplier of 1.
 */
import { ClientProfile, PlatformKey } from "@/types/dashboard";

export function rateForReportingCurrency(
  client: Pick<ClientProfile, "currency" | "usdToSarRate" | "usdToAedRate">,
): number {
  switch (client.currency) {
    case "SAR":
      return Number(client.usdToSarRate) > 0 ? Number(client.usdToSarRate) : 1;
    case "AED":
      return Number(client.usdToAedRate) > 0 ? Number(client.usdToAedRate) : 1;
    default:
      return 1; // USD or anything unrecognised — no conversion.
  }
}

/**
 * Per-platform multiplier. Currently a uniform passthrough to
 * `rateForReportingCurrency` because all USD costs convert at the same
 * client-level rate. Kept as a per-platform function so callers don't need
 * to be refactored if per-platform overrides are ever reintroduced.
 */
export function platformConvertRate(
  client: Pick<ClientProfile, "currency" | "usdToSarRate" | "usdToAedRate">,
  _platformKey: PlatformKey,
): number {
  return rateForReportingCurrency(client);
}
