/**
 * Money conversion helpers.
 *
 * The dashboard's source-of-truth spend (`row.cost`) is denominated in USD
 * (the BigQuery RPC sums `cost_usd`). When the reporting currency is SAR or
 * AED, we multiply by the matching client-level rate to produce the value
 * shown to the user. The per-platform `reportingCurrency` documents which
 * native currency each platform reports in — we only convert when it differs
 * from the dashboard's reporting currency.
 *
 * Returns 1 when no conversion is needed (USD reporting, or platform already
 * reports in the same currency as the dashboard).
 */
import { ClientProfile, PlatformKey } from '@/types/dashboard';

export function rateForReportingCurrency(client: Pick<ClientProfile, 'currency' | 'usdToSarRate' | 'usdToAedRate'>): number {
  switch (client.currency) {
    case 'SAR': return Number(client.usdToSarRate) > 0 ? Number(client.usdToSarRate) : 1;
    case 'AED': return Number(client.usdToAedRate) > 0 ? Number(client.usdToAedRate) : 1;
    default:    return 1; // USD or anything unrecognised — no conversion.
  }
}

/**
 * Per-platform multiplier applied to USD cost to produce the value in the
 * reporting currency. Skipped when the platform's native currency already
 * matches the reporting currency.
 */
export function platformConvertRate(
  client: Pick<ClientProfile, 'currency' | 'usdToSarRate' | 'usdToAedRate' | 'platforms'>,
  platformKey: PlatformKey,
): number {
  const platformCurrency = client.platforms[platformKey]?.reportingCurrency || 'USD';
  if (platformCurrency === client.currency) return 1;
  return rateForReportingCurrency(client);
}
