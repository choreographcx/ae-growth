import React from 'react';
import type { ClientProfile, PlatformSummary, KPIGroupData, AlertItem } from '@/types/dashboard';

// PDF generation is temporarily disabled due to @react-pdf/renderer sandbox compatibility issues.
// This stub preserves the interface so the rest of the app compiles.

interface PDFReportProps {
  client: ClientProfile;
  dateRange: string;
  kpiGroups: KPIGroupData[];
  platformSummaries: PlatformSummary[];
  alerts: AlertItem[];
  enabledPlatforms: string[];
}

export function PDFReport(_props: PDFReportProps) {
  return null;
}
