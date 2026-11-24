import { Text, View } from "@react-pdf/renderer";
import type { ContactValues } from "@/features/site/validations/site.schema";
import type { Folio } from "@/features/billing/services/folio.service";
import { formatDateTime, formatDay } from "../lib/period";
import { COLOR, ReportDocument, Table, amount, money, s } from "./Layout";

export interface FolioGuest {
  reference: string;
  guestName: string;
  email: string;
  phone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: string;
}

const METHOD: Record<string, string> = { CASH: "Cash", CREDIT_CARD: "Card", BANK_TRANSFER: "Bank transfer" };
const CATEGORY: Record<string, string> = { ROOM_RATE: "Room", F_AND_B: "Food & drink", SAFARI: "Safari", SPA: "Spa", OTHER: "Other" };

/** The guest's bill, to print or email at check-out. */
export function FolioPdf({ folio, guest, contact, generatedAt }: { folio: Folio; guest: FolioGuest; contact: ContactValues; generatedAt: string }) {
  const cur = folio.currencyCode;
  const balance = Number(folio.balance);
  const statusText = folio.status === "CLOSED" ? "Settled" : folio.status === "VOIDED" ? "Void" : balance > 0 ? "Balance due" : "Open";

  return (
    <ReportDocument title="Guest bill" subtitle={`Reference ${guest.reference}`} contact={contact} generatedAt={generatedAt}>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 4 }}>
        <View style={{ flex: 1, backgroundColor: COLOR.sand, borderRadius: 6, padding: 10 }}>
          <Text style={s.tileLabel}>Billed to</Text>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 }}>{guest.guestName}</Text>
          <Text style={{ marginTop: 2 }}>{guest.email}</Text>
          {guest.phone && <Text>{guest.phone}</Text>}
        </View>
        <View style={{ flex: 1, backgroundColor: COLOR.sand, borderRadius: 6, padding: 10 }}>
          <Text style={s.tileLabel}>Stay</Text>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 }}>
            {formatDay(guest.checkIn)} - {formatDay(guest.checkOut)}
          </Text>
          <Text style={{ marginTop: 2 }}>
            {guest.nights} night{guest.nights === 1 ? "" : "s"}  |  Room {guest.rooms}
          </Text>
        </View>
        <View style={{ width: 120, backgroundColor: balance > 0 ? "#fef3c7" : "#d1fae5", borderRadius: 6, padding: 10 }}>
          <Text style={s.tileLabel}>{statusText}</Text>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3, color: balance > 0 ? COLOR.amber : COLOR.emerald }}>
            {money(Math.max(0, balance), cur)}
          </Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Charges</Text>
      <Table
        columns={[
          { label: "Date", width: 1.5, render: (l) => formatDateTime(l.createdAt) },
          { label: "Item", width: 3, render: (l) => `${CATEGORY[l.category] ?? l.category}: ${l.description}` },
          { label: "Net", width: 1, align: "right", render: (l) => amount(Number(l.subtotal)) },
          { label: "Tax", width: 0.9, align: "right", render: (l) => amount(Number(l.tax)) },
          { label: `Total (${cur})`, width: 1.2, align: "right", render: (l) => amount(Number(l.total)) },
        ]}
        rows={folio.lines}
        empty="No charges on this bill yet."
        total={["Total", "", amount(Number(folio.subtotal)), amount(Number(folio.tax)), amount(Number(folio.total))]}
      />

      <Text style={s.sectionTitle}>Payments</Text>
      <Table
        columns={[
          { label: "Date", width: 1.5, render: (p) => formatDateTime(p.createdAt) },
          { label: "Method", width: 2, render: (p) => METHOD[p.method] ?? p.method },
          { label: "Status", width: 1.4, render: (p) => p.status.charAt(0) + p.status.slice(1).toLowerCase() },
          { label: `Amount (${cur})`, width: 1.2, align: "right", render: (p) => amount(Number(p.amount)) },
        ]}
        rows={folio.payments}
        empty="No payments recorded."
      />

      <View style={{ marginTop: 14, marginLeft: "auto", width: 220 }}>
        {[
          ["Charges", money(Number(folio.total), cur)],
          ["Paid", money(Number(folio.paid), cur)],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
            <Text style={{ color: COLOR.muted }}>{k}</Text>
            <Text>{v}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: 1, borderTopColor: COLOR.ink, marginTop: 2 }}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Balance</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(balance, cur)}</Text>
        </View>
      </View>

      {!folio.taxConfigured && <Text style={s.note}>No tax rate is configured, so no tax has been added to these charges.</Text>}
      <Text style={{ ...s.note, marginTop: 18, textAlign: "center", fontSize: 9, color: COLOR.forest }}>
        Thank you for staying with us. We hope to see you again in Udawalawe.
      </Text>
    </ReportDocument>
  );
}
