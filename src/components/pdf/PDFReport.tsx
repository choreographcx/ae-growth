import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Path,
} from '@react-pdf/renderer';
import type { ClientProfile, PlatformSummary, KPIGroupData, AlertItem } from '@/types/dashboard';

// Register Inter font from Google Fonts CDN
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 300 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLufAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

const colors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  primary: '#0D9668',
  positive: '#16A34A',
  negative: '#DC2626',
  warning: '#F59E0B',
  info: '#0EA5E9',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: colors.text,
    backgroundColor: colors.bg,
    padding: '24 28',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: 700 },
  headerSub: { fontSize: 8, color: colors.muted, marginTop: 4 },
  headerMeta: { textAlign: 'right', fontSize: 7, color: colors.muted, lineHeight: 1.6 },
  // Section
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, marginTop: 16 },
  sectionSub: { fontSize: 8, color: colors.muted, marginBottom: 8 },
  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: {
    width: '31.5%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: '10 12',
    marginBottom: 4,
  },
  kpiLabel: { fontSize: 7, color: colors.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontWeight: 700, marginTop: 2 },
  kpiChange: { fontSize: 7, fontWeight: 600, marginTop: 2 },
  kpiSupporting: { flexDirection: 'row', gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: colors.border },
  kpiSupportItem: {},
  kpiSupportLabel: { fontSize: 6.5, color: colors.muted },
  kpiSupportValue: { fontSize: 8, fontWeight: 600, marginTop: 1 },
  // Table
  table: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderCell: { fontSize: 7, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tableCell: { fontSize: 8 },
  // Alerts
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: '6 10', marginBottom: 4 },
  alertDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8, marginTop: 3 },
  alertTitle: { fontSize: 8, fontWeight: 600 },
  alertDesc: { fontSize: 7, color: colors.muted, marginTop: 1 },
  // Footer
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: colors.muted },
});

// AED symbol as SVG for PDF
function AedPDF({ size = 7 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 1000 870" style={{ width: size * 1.15, height: size }}>
      <Path fill={colors.text} d="m88.3 1c0.4 0.6 2.6 3.3 4.7 5.9 15.3 18.2 26.8 47.8 33 85.1 4.1 24.5 4.3 32.2 4.3 125.6v87h-41.8c-38.2 0-42.6-0.2-50.1-1.7-11.8-2.5-24-9.2-32.2-17.8-6.5-6.9-6.3-7.3-5.9 13.6 0.5 17.3 0.7 19.2 3.2 28.6 4 14.9 9.5 26 17.8 35.9 11.3 13.6 22.8 21.2 39.2 26.3 3.5 1 10.9 1.4 37.1 1.6l32.7 0.5v43.3 43.4l-46.1-0.3-46.3-0.3-8-3.2c-9.5-3.8-13.8-6.6-23.1-14.9l-6.8-6.1 0.4 19.1c0.5 17.7 0.6 19.7 3.1 28.7 8.7 31.8 29.7 54.5 57.4 61.9 6.9 1.9 9.6 2 38.5 2.4l30.9 0.4v89.6c0 54.1-0.3 94-0.8 100.8-0.5 6.2-2.1 17.8-3.5 25.9-6.5 37.3-18.2 65.4-35 83.6l-3.4 3.7h169.1c101.1 0 176.7-0.4 187.8-0.9 19.5-1 63-5.3 72.8-7.4 3.1-0.6 8.9-1.5 12.7-2.1 8.1-1.2 21.5-4 40.8-8.9 27.2-6.8 52-15.3 76.3-26.1 7.6-3.4 29.4-14.5 35.2-18 3.1-1.8 6.8-4 8.2-4.7 3.9-2.1 10.4-6.3 19.9-13.1 4.7-3.4 9.4-6.7 10.4-7.4 4.2-2.8 18.7-14.9 25.3-21 25.1-23.1 46.1-48.8 62.4-76.3 2.3-4 5.3-9 6.6-11.1 3.3-5.6 16.9-33.6 18.2-37.8 0.6-1.9 1.4-3.9 1.8-4.3 2.6-3.4 17.6-50.6 19.4-60.9 0.6-3.3 0.9-3.8 3.4-4.3 1.6-0.3 24.9-0.3 51.8-0.1 53.8 0.4 53.8 0.4 65.7 5.9 6.7 3.1 8.7 4.5 16.1 11.2 9.7 8.7 8.8 10.1 8.2-11.7-0.4-12.8-0.9-20.7-1.8-23.9-3.4-12.3-4.2-14.9-7.2-21.1-9.8-21.4-26.2-36.7-47.2-44l-8.2-3-33.4-0.4-33.3-0.5 0.4-11.7c0.4-15.4 0.4-45.9-0.1-61.6l-0.4-12.6 44.6-0.2c38.2-0.2 45.3 0 49.5 1.1 12.6 3.5 21.1 8.3 31.5 17.8l5.8 5.4v-14.8c0-17.6-0.9-25.4-4.5-37-7.1-23.5-21.1-41-41.1-51.8-13-7-13.8-7.2-58.5-7.5-26.2-0.2-39.9-0.6-40.6-1.2-0.6-0.6-1.1-1.6-1.1-2.4 0-0.8-1.5-7.1-3.5-13.9-23.4-82.7-67.1-148.4-131-197.1-8.7-6.7-30-20.8-38.6-25.6-3.3-1.9-6.9-3.9-7.8-4.5-4.2-2.3-28.3-14.1-34.3-16.6-3.6-1.6-8.3-3.6-10.4-4.4-35.3-15.3-94.5-29.8-139.7-34.3-7.4-0.7-17.2-1.8-21.7-2.2-20.4-2.3-48.7-2.6-209.4-2.6-135.8 0-169.9 0.3-169.4 1zm330.7 43.3c33.8 2 54.6 4.6 78.9 10.5 74.2 17.6 126.4 54.8 164.3 117 3.5 5.8 18.3 36 20.5 42.1 10.5 28.3 15.6 45.1 20.1 67.3 1.1 5.4 2.6 12.6 3.3 16 0.7 3.3 1 6.4 0.7 6.7-0.5 0.4-100.9 0.6-223.3 0.5l-222.5-0.2-0.3-128.5c-0.1-70.6 0-129.3 0.3-130.4l0.4-1.9h71.1c39 0 78 0.4 86.5 0.9zm297.5 350.3c0.7 4.3 0.7 77.3 0 80.9l-0.6 2.7-227.5-0.2-227.4-0.3-0.2-42.4c-0.2-23.3 0-42.7 0.2-43.1 0.3-0.5 97.2-0.8 227.7-0.8h227.2zm-10.2 171.7c0.5 1.5-1.9 13.8-6.8 33.8-5.6 22.5-13.2 45.2-20.9 62-3.8 8.6-13.3 27.2-15.6 30.7-1.1 1.6-4.3 6.7-7.1 11.2-18 28.2-43.7 53.9-73 72.9-10.7 6.8-32.7 18.4-38.6 20.2-1.2 0.3-2.5 0.9-3 1.3-0.7 0.6-9.8 4-20.4 7.8-19.5 6.9-56.6 14.4-86.4 17.5-19.3 1.9-22.4 2-96.7 2h-76.9v-129.7-129.8l220.9-0.4c121.5-0.2 221.6-0.5 222.4-0.7 0.9-0.1 1.8 0.5 2.1 1.2z" />
    </Svg>
  );
}

function currencyPrefix(currency: string, size = 7): React.ReactNode {
  if (currency === 'AED') return <AedPDF size={size} />;
  if (currency === 'SAR') return <Text>﷼</Text>;
  return <Text>$</Text>;
}

function formatValue(val: string, currency: string): React.ReactNode {
  if (typeof val === 'string' && val.startsWith('$')) {
    const num = val.slice(1);
    return (
      <Text style={{ flexDirection: 'row' }}>
        {currency === 'AED' ? '' : currency === 'SAR' ? '﷼' : '$'}{num}
      </Text>
    );
  }
  return <Text>{val}</Text>;
}

function formatValueStr(val: string, currency: string): string {
  if (val.startsWith('$')) {
    const num = val.slice(1);
    if (currency === 'AED') return `د.إ${num}`;
    if (currency === 'SAR') return `﷼${num}`;
    return `$${num}`;
  }
  return val;
}

function ChangeText({ change }: { change?: number }) {
  if (change == null) return null;
  const isPos = change >= 0;
  return (
    <Text style={[s.kpiChange, { color: isPos ? colors.positive : colors.negative }]}>
      {isPos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </Text>
  );
}

const alertColors: Record<string, string> = {
  error: colors.negative,
  warning: colors.warning,
  success: colors.positive,
  info: colors.info,
};

interface PDFReportProps {
  client: ClientProfile;
  dateRange: string;
  kpiGroups: KPIGroupData[];
  platformSummaries: PlatformSummary[];
  alerts: AlertItem[];
  enabledPlatforms: string[];
}

export function PDFReport({ client, dateRange, kpiGroups, platformSummaries, alerts, enabledPlatforms }: PDFReportProps) {
  const now = new Date();
  const exportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const exportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currSym = client.currency === 'AED' ? 'د.إ' : client.currency === 'SAR' ? '﷼' : '$';

  // Extract string values from KPI groups (formattedValue could be ReactNode in app, but raw data has strings)
  const kpiData = kpiGroups.map(g => ({
    title: g.title,
    primaryLabel: g.primary.label,
    primaryValue: typeof g.primary.formattedValue === 'string' ? g.primary.formattedValue : `${g.primary.value.toLocaleString()}`,
    primaryChange: g.primary.change,
    supporting: g.supporting.map(sup => ({
      label: sup.label,
      value: typeof sup.formattedValue === 'string' ? sup.formattedValue : '',
      change: sup.change,
    })),
  }));

  const colWidths = [110, 55, 60, 45, 40, 32, 55, 40, 55];
  const colHeaders = ['Platform', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'Conversions', 'CPA', 'Conv. Rate'];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.headerTitle}>{client.name} — Performance Report</Text>
            <Text style={s.headerSub}>Period: {dateRange} · Currency: {currSym} {client.currency}</Text>
          </View>
          <View>
            <Text style={s.headerMeta}>Exported: {exportDate} at {exportTime}</Text>
            <Text style={s.headerMeta}>Generated by Paid Media Dashboard</Text>
          </View>
        </View>

        {/* KPI Cards */}
        <Text style={[s.sectionTitle, { marginTop: 0 }]}>Overview</Text>
        <Text style={s.sectionSub}>Cross-platform performance summary</Text>
        <View style={s.kpiGrid}>
          {kpiData.map((kpi, i) => (
            <View key={i} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{kpi.title}</Text>
              <Text style={s.kpiValue}>{formatValueStr(kpi.primaryValue, client.currency)}</Text>
              <ChangeText change={kpi.primaryChange} />
              {kpi.supporting.length > 0 && (
                <View style={s.kpiSupporting}>
                  {kpi.supporting.map((sup, j) => (
                    <View key={j} style={s.kpiSupportItem}>
                      <Text style={s.kpiSupportLabel}>{sup.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={s.kpiSupportValue}>{formatValueStr(sup.value, client.currency)}</Text>
                        {sup.change != null && (
                          <Text style={{ fontSize: 6, color: sup.change >= 0 ? colors.positive : colors.negative, fontWeight: 600 }}>
                            {sup.change >= 0 ? '▲' : '▼'}{Math.abs(sup.change).toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Paid Media Dashboard</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2: Platform Comparison Table */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.headerTitle}>{client.name} — Performance Report</Text>
            <Text style={s.headerSub}>Period: {dateRange}</Text>
          </View>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 0 }]}>Platform Performance</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            {colHeaders.map((h, i) => (
              <Text key={i} style={[s.tableHeaderCell, { width: colWidths[i] }]}>{h}</Text>
            ))}
          </View>
          {platformSummaries
            .filter(p => enabledPlatforms.includes(p.platform))
            .map((p, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? { backgroundColor: '#F8FAFC' } : {}]}>
                <Text style={[s.tableCell, { width: colWidths[0], fontWeight: 600 }]}>{p.label}</Text>
                <Text style={[s.tableCell, { width: colWidths[1] }]}>{currSym}{p.spend.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[2] }]}>{(p.impressions / 1e6).toFixed(2)}M</Text>
                <Text style={[s.tableCell, { width: colWidths[3] }]}>{p.clicks.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[4] }]}>{p.ctr.toFixed(2)}%</Text>
                <Text style={[s.tableCell, { width: colWidths[5] }]}>{currSym}{p.cpc.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: colWidths[6] }]}>{p.conversions.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[7] }]}>{currSym}{p.cpa.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: colWidths[8] }]}>{p.conversionRate.toFixed(2)}%</Text>
              </View>
            ))}
          {/* Totals row */}
          {(() => {
            const filtered = platformSummaries.filter(p => enabledPlatforms.includes(p.platform));
            const totals = {
              spend: filtered.reduce((s, p) => s + p.spend, 0),
              impressions: filtered.reduce((s, p) => s + p.impressions, 0),
              clicks: filtered.reduce((s, p) => s + p.clicks, 0),
              conversions: filtered.reduce((s, p) => s + p.conversions, 0),
            };
            const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
            const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
            const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
            const cr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
            return (
              <View style={[s.tableRow, { borderTopWidth: 1.5, borderTopColor: colors.border, backgroundColor: '#F1F5F9' }]}>
                <Text style={[s.tableCell, { width: colWidths[0], fontWeight: 700 }]}>Total</Text>
                <Text style={[s.tableCell, { width: colWidths[1], fontWeight: 700 }]}>{currSym}{totals.spend.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[2], fontWeight: 700 }]}>{(totals.impressions / 1e6).toFixed(2)}M</Text>
                <Text style={[s.tableCell, { width: colWidths[3], fontWeight: 700 }]}>{totals.clicks.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[4], fontWeight: 700 }]}>{ctr.toFixed(2)}%</Text>
                <Text style={[s.tableCell, { width: colWidths[5], fontWeight: 700 }]}>{currSym}{cpc.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: colWidths[6], fontWeight: 700 }]}>{totals.conversions.toLocaleString()}</Text>
                <Text style={[s.tableCell, { width: colWidths[7], fontWeight: 700 }]}>{currSym}{cpa.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: colWidths[8], fontWeight: 700 }]}>{cr.toFixed(2)}%</Text>
              </View>
            );
          })()}
        </View>

        {/* Alerts */}
        <Text style={s.sectionTitle}>Diagnostics & Alerts</Text>
        {alerts.map((alert, i) => (
          <View key={i} style={s.alertCard}>
            <View style={[s.alertDot, { backgroundColor: alertColors[alert.type] || colors.muted }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>{alert.title}</Text>
              <Text style={s.alertDesc}>{alert.description}</Text>
            </View>
            <Text style={{ fontSize: 6.5, color: colors.muted }}>{alert.timestamp}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>Paid Media Dashboard</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
