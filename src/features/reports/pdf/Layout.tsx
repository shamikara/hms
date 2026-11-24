import type { ReactNode } from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SITE } from "@/lib/seo/site";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { LOGO_DATA_URI } from "./logo";

// Never break words with a hyphen: "Dou-ble Room" reads badly in a table.
Font.registerHyphenationCallback((word) => [word]);

export const COLOR = {
  ink: "#1c1917",
  muted: "#78716c",
  line: "#e7e5e4",
  sand: "#f6f1e8",
  forest: "#13291f",
  emerald: "#047857",
  amber: "#b45309",
  red: "#b91c1c",
};

export const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 54, paddingHorizontal: 36, fontSize: 9, fontFamily: "Helvetica", color: COLOR.ink },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: COLOR.forest, marginBottom: 16 },
  logo: { width: 46, height: 46, marginRight: 12 },
  brand: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLOR.forest },
  brandSub: { fontSize: 8, color: COLOR.muted, marginTop: 2 },
  titleBox: { marginLeft: "auto", alignItems: "flex-end" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 8.5, color: COLOR.muted, marginTop: 3 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 24, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLOR.muted, borderTopWidth: 0.5, borderTopColor: COLOR.line, paddingTop: 6 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: COLOR.forest },
  // summary tiles
  tiles: { flexDirection: "row", gap: 8, marginBottom: 6 },
  tile: { flex: 1, backgroundColor: COLOR.sand, borderRadius: 6, padding: 9 },
  tileLabel: { fontSize: 7, color: COLOR.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  tileValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  tileNote: { fontSize: 7, color: COLOR.muted, marginTop: 2 },
  // tables
  th: { flexDirection: "row", backgroundColor: COLOR.forest, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 4 },
  tr: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLOR.line },
  trAlt: { backgroundColor: "#fafaf9" },
  trTotal: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: COLOR.ink, fontFamily: "Helvetica-Bold" },
  empty: { padding: 14, textAlign: "center", color: COLOR.muted, borderWidth: 0.5, borderColor: COLOR.line, borderRadius: 4 },
  note: { fontSize: 7.5, color: COLOR.muted, marginTop: 6, lineHeight: 1.4 },
});

/**
 * Every report's frame: logo, property, title and period at the top; who it
 * was generated for, when, and page x of y at the bottom of every page.
 */
export function ReportDocument({
  title,
  subtitle,
  contact,
  generatedAt,
  landscape = false,
  children,
}: {
  title: string;
  subtitle: string;
  contact: ContactValues;
  generatedAt: string;
  landscape?: boolean;
  children: ReactNode;
}) {
  return (
    <Document title={`${title} - ${SITE.name}`} author={SITE.name} creator={SITE.name} producer={SITE.name}>
      <Page size="A4" orientation={landscape ? "landscape" : "portrait"} style={s.page} wrap>
        <View style={s.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={LOGO_DATA_URI} style={s.logo} />
          <View>
            <Text style={s.brand}>{SITE.name}</Text>
            <Text style={s.brandSub}>
              {contact.street}, {contact.locality} {contact.postalCode}, Sri Lanka
            </Text>
            <Text style={s.brandSub}>
              {contact.phoneDisplay}  |  {contact.email}
            </Text>
          </View>
          <View style={s.titleBox}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {children}

        <View style={s.footer} fixed>
          <Text>Generated {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}</Text>
      {note && <Text style={s.tileNote}>{note}</Text>}
    </View>
  );
}

export interface Column<T> {
  label: string;
  /** Flex weight; columns share the row by these. */
  width: number;
  align?: "left" | "right" | "center";
  render: (row: T) => string;
}

/**
 * A table whose header repeats on every page and whose rows never split
 * across a page break.
 */
export function Table<T>({ columns, rows, empty, total }: { columns: Column<T>[]; rows: T[]; empty: string; total?: string[] }) {
  if (rows.length === 0) return <Text style={s.empty}>{empty}</Text>;
  return (
    <View>
      <View style={s.th} fixed>
        {columns.map((c) => (
          <Text key={c.label} style={{ flex: c.width, textAlign: c.align ?? "left", paddingHorizontal: 2 }}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={i % 2 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
          {columns.map((c) => (
            <Text key={c.label} style={{ flex: c.width, textAlign: c.align ?? "left", paddingHorizontal: 2 }}>
              {c.render(row)}
            </Text>
          ))}
        </View>
      ))}
      {total && (
        <View style={s.trTotal} wrap={false}>
          {columns.map((c, i) => (
            <Text key={c.label} style={{ flex: c.width, textAlign: c.align ?? "left", paddingHorizontal: 2 }}>
              {total[i] ?? ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** Money without a currency symbol, for dense tables; the currency is in the heading. */
export function amount(value: number): string {
  return new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Money with its currency, for totals and tiles. */
export function money(value: number, currency: string): string {
  return `${currency} ${amount(value)}`;
}
