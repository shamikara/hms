import { Text, View } from "@react-pdf/renderer";
import type { ContactValues } from "@/features/site/validations/site.schema";
import type { OccupancyGrid } from "@/features/admin/actions/calendar.actions";
import { formatDay } from "../lib/period";
import { COLOR, ReportDocument, Table, Tile, s } from "./Layout";

/** A month on one landscape page: rooms down the side, nights across. */
export function OccupancyPdf({ grid, monthLabel, contact, generatedAt }: { grid: OccupancyGrid; monthLabel: string; contact: ContactValues; generatedAt: string }) {
  const sold = grid.occupancy.reduce((n, d) => n + d.sold, 0);
  const sellable = grid.occupancy.reduce((n, d) => n + d.sellable, 0);
  const rate = sellable > 0 ? Math.round((sold / sellable) * 100) : 0;
  const busiest = [...grid.occupancy].sort((a, b) => b.sold - a.sold)[0];
  const cell = { flex: 1, fontSize: 6, textAlign: "center" as const, paddingVertical: 3 };

  return (
    <ReportDocument title="Occupancy" subtitle={monthLabel} contact={contact} generatedAt={generatedAt} landscape>
      <View style={s.tiles}>
        <Tile label="Occupancy" value={`${rate}%`} note={`${sold} of ${sellable} room nights`} />
        <Tile label="Rooms" value={String(grid.rows.length)} note={`${grid.rows.filter((r) => r.status !== "AVAILABLE").length} off sale now`} />
        <Tile label="Busiest night" value={busiest && busiest.sold > 0 ? formatDay(busiest.date) : "-"} note={busiest ? `${busiest.sold} rooms sold` : undefined} />
      </View>

      <Text style={s.sectionTitle}>Room chart</Text>
      <View style={{ borderWidth: 0.5, borderColor: COLOR.line }}>
        <View style={{ flexDirection: "row", backgroundColor: COLOR.forest, color: "#fff" }}>
          <Text style={{ width: 92, fontSize: 7, fontFamily: "Helvetica-Bold", padding: 3 }}>Room</Text>
          {grid.days.map((d) => (
            <Text key={d} style={{ ...cell, fontFamily: "Helvetica-Bold" }}>{Number(d.slice(8))}</Text>
          ))}
        </View>
        {grid.rows.map((row) => (
          <View key={row.roomId} style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: COLOR.line }} wrap={false}>
            <Text style={{ width: 92, fontSize: 7, padding: 3 }}>
              {row.roomNumber} <Text style={{ color: COLOR.muted }}>{row.roomTypeName}</Text>
            </Text>
            {grid.days.map((d) => {
              const night = row.nights[d];
              const off = row.status !== "AVAILABLE";
              return (
                <Text
                  key={d}
                  style={{
                    ...cell,
                    backgroundColor: night ? (night.checkedIn ? COLOR.forest : COLOR.emerald) : off ? "#e7e5e4" : "#ffffff",
                    color: "#ffffff",
                    borderLeftWidth: 0.5,
                    borderLeftColor: COLOR.line,
                  }}
                >
                  {night?.isArrival ? "|" : " "}
                </Text>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: COLOR.ink }}>
          <Text style={{ width: 92, fontSize: 7, fontFamily: "Helvetica-Bold", padding: 3 }}>Sold</Text>
          {grid.occupancy.map((o) => (
            <Text key={o.date} style={{ ...cell, fontFamily: "Helvetica-Bold" }}>{o.sold}</Text>
          ))}
        </View>
      </View>
      <Text style={s.note}>
        Green: booked. Dark green: guest checked in. Grey: room off sale (maintenance) at the time of
        printing. A bar marks the night of arrival.
      </Text>

      <Text style={s.sectionTitle}>By room</Text>
      <Table
        columns={[
          { label: "Room", width: 2.5, render: (r) => `${r.roomNumber}  ${r.roomTypeName}` },
          { label: "Nights sold", width: 1, align: "right", render: (r) => String(Object.keys(r.nights).length) },
          { label: "Occupancy", width: 1, align: "right", render: (r) => `${Math.round((Object.keys(r.nights).length / grid.days.length) * 100)}%` },
          { label: "Status now", width: 1.2, align: "right", render: (r) => (r.status === "AVAILABLE" ? "On sale" : r.status === "MAINTENANCE" ? "Maintenance" : "Out of order") },
        ]}
        rows={grid.rows}
        empty="No rooms set up."
      />
    </ReportDocument>
  );
}
