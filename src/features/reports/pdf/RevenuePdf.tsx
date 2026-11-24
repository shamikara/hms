import { Text, View } from "@react-pdf/renderer";
import type { ContactValues } from "@/features/site/validations/site.schema";
import type { RevenueReport } from "../services/report-data.service";
import { formatDateTime, formatDay, type Period } from "../lib/period";
import { ReportDocument, Table, Tile, amount, money, s } from "./Layout";

export function RevenuePdf({ report, period, contact, generatedAt }: { report: RevenueReport; period: Period; contact: ContactValues; generatedAt: string }) {
  const t = report.totals;
  const cur = report.currencyCode;
  const breakdown = (record: Record<string, number>) =>
    Object.entries(record).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

  return (
    <ReportDocument
      title="Revenue & payments"
      subtitle={`${formatDay(period.from)} to ${formatDay(period.to)}`}
      contact={contact}
      generatedAt={generatedAt}
    >
      <View style={s.tiles}>
        <Tile label="Charged" value={money(t.chargesTotal, cur)} note={`incl. ${money(t.chargesTax, cur)} tax`} />
        <Tile label="Received" value={money(t.received, cur)} note="Cleared payments" />
        <Tile label="Refunded" value={money(t.refunded, cur)} />
        <Tile label="Owed now" value={money(t.outstandingNow, cur)} note="All open bills, today" />
      </View>

      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Charges by type</Text>
          <Table
            columns={[
              { label: "Type", width: 2, render: (r) => r.label },
              { label: `Total (${cur})`, width: 1.4, align: "right", render: (r) => amount(r.value) },
            ]}
            rows={breakdown(t.byCategory)}
            empty="No charges posted."
            total={["Total", amount(t.chargesTotal)]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Payments by method</Text>
          <Table
            columns={[
              { label: "Method", width: 2, render: (r) => r.label },
              { label: `Received (${cur})`, width: 1.4, align: "right", render: (r) => amount(r.value) },
            ]}
            rows={breakdown(t.byMethod)}
            empty="No cleared payments."
            total={["Total", amount(t.received)]}
          />
        </View>
      </View>

      <Text style={s.sectionTitle}>Charges posted</Text>
      <Table
        columns={[
          { label: "Date", width: 1.6, render: (r) => formatDateTime(r.date) },
          { label: "Ref", width: 1, render: (r) => r.reference },
          { label: "Guest", width: 1.7, render: (r) => r.guest },
          { label: "Item", width: 2.4, render: (r) => `${r.category}: ${r.description}` },
          { label: "Net", width: 1.1, align: "right", render: (r) => amount(r.subtotal) },
          { label: "Tax", width: 0.9, align: "right", render: (r) => amount(r.tax) },
          { label: "Total", width: 1.1, align: "right", render: (r) => amount(r.total) },
        ]}
        rows={report.charges}
        empty="No charges were posted in this period."
        total={["Total", "", "", "", amount(t.chargesSubtotal), amount(t.chargesTax), amount(t.chargesTotal)]}
      />

      <Text style={s.sectionTitle}>Payments</Text>
      <Table
        columns={[
          { label: "Date", width: 1.6, render: (r) => formatDateTime(r.date) },
          { label: "Ref", width: 1, render: (r) => r.reference },
          { label: "Guest", width: 2, render: (r) => r.guest },
          { label: "Method", width: 1.3, render: (r) => r.method },
          { label: "Status", width: 1.1, render: (r) => r.status },
          { label: `Amount (${cur})`, width: 1.4, align: "right", render: (r) => amount(r.amount) },
        ]}
        rows={report.payments}
        empty="No payments were taken in this period."
      />
      <Text style={s.note}>
        Charges and payments are dated when they were entered at the desk (Sri Lanka time). Only cleared
        payments count as received; pending, failed and refunded ones are listed for reference.
      </Text>
    </ReportDocument>
  );
}
