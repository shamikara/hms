import { Text, View } from "@react-pdf/renderer";
import type { ContactValues } from "@/features/site/validations/site.schema";
import type { BookingRow, BookingsReport } from "../services/report-data.service";
import { formatDay, type Period } from "../lib/period";
import { ReportDocument, Table, Tile, amount, money, s, type Column } from "./Layout";

export function BookingsPdf({ report, period, contact, generatedAt }: { report: BookingsReport; period: Period; contact: ContactValues; generatedAt: string }) {
  const t = report.totals;
  const columns: Column<BookingRow>[] = [
    { label: "Ref", width: 1.1, render: (r) => r.reference },
    { label: "Guest", width: 2.4, render: (r) => `${r.guest}\n${r.email}${r.phone ? `\n${r.phone}` : ""}` },
    { label: "Room", width: 2.2, render: (r) => r.rooms },
    { label: "Check in", width: 1.3, render: (r) => formatDay(r.checkIn) },
    { label: "Check out", width: 1.3, render: (r) => formatDay(r.checkOut) },
    { label: "Nights", width: 0.7, align: "right", render: (r) => String(r.nights) },
    { label: "Status", width: 1.1, render: (r) => r.status },
    { label: `Est. (${report.currencyCode})`, width: 1.4, align: "right", render: (r) => (r.estimate === null ? "On request" : amount(r.estimate)) },
  ];

  return (
    <ReportDocument
      title="Bookings report"
      subtitle={`Arrivals ${formatDay(period.from)} to ${formatDay(period.to)}`}
      contact={contact}
      generatedAt={generatedAt}
      landscape
    >
      <View style={s.tiles}>
        <Tile label="Bookings" value={String(t.bookings)} note={`${t.byStatus.Cancelled + t.byStatus["No-show"]} cancelled or no-show`} />
        <Tile label="Room nights" value={String(t.roomNights)} note="Bookings going ahead" />
        <Tile label="Pending" value={String(t.byStatus.Pending)} note="Not yet confirmed" />
        <Tile label="Confirmed / in house" value={String(t.byStatus.Confirmed + t.byStatus["In house"] + t.byStatus.Departed)} />
        <Tile
          label="Estimated value"
          value={money(t.estimatedValue, report.currencyCode)}
          note={t.unpricedBookings > 0 ? `+ ${t.unpricedBookings} on request` : "Rate x nights"}
        />
      </View>

      <Text style={s.sectionTitle}>Bookings</Text>
      <Table columns={columns} rows={report.rows} empty="No arrivals in this period." />
      <Text style={s.note}>
        Estimates are the agreed nightly rate times nights, before tax, extras and discounts. They are not
        bills. Cancelled and no-show bookings are listed but left out of the totals.
      </Text>
    </ReportDocument>
  );
}
