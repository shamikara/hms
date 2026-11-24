import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { getDeskReservation } from "@/features/admin/actions/reservations.actions";
import { loadFolio } from "@/features/billing/actions/folio.actions";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { FolioPanel } from "@/features/billing/components/FolioPanel";
import { listOnlinePayments } from "@/features/payments/actions/payment-admin.actions";
import { OnlinePaymentsPanel } from "@/features/payments/components/OnlinePaymentsPanel";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [reservationResult, folioResult, actor, onlineResult] = await Promise.all([
    getDeskReservation(id),
    loadFolio(id),
    getAdminActor(),
    listOnlinePayments(id),
  ]);

  const reservation = reservationResult.success ? reservationResult.data : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-emerald-500 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All reservations
      </Link>

      {!reservation ? (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm">
          {reservationResult.error ?? "That reservation could not be found."}
        </div>
      ) : (
        <>
          <header className="space-y-1.5 relative">
            {actor?.permissions.includes("finance:view") && (
              <a
                href={`/admin/bookings/${id}/bill`}
                className="sm:absolute sm:right-0 sm:top-0 mb-3 sm:mb-0 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" /> Download bill (PDF)
              </a>
            )}
            <p className="font-mono text-xs text-stone-500">{reservation.reference}</p>
            <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">
              {reservation.guestName}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {reservation.checkInDate} to {reservation.checkOutDate} ·{" "}
              {reservation.nights} night{reservation.nights === 1 ? "" : "s"} ·{" "}
              {reservation.roomNumbers.length > 0
                ? `Room ${reservation.roomNumbers.join(", ")}`
                : "No room assigned"}
            </p>
            <p className="text-xs text-stone-500 font-mono">
              {reservation.email}
              {reservation.phone ? ` · ${reservation.phone}` : ""}
            </p>
          </header>

          {onlineResult.success && onlineResult.data && (
            <OnlinePaymentsPanel
              rows={onlineResult.data}
              canManage={actor?.permissions.includes("billing:manage") ?? false}
            />
          )}

          {folioResult.success && folioResult.data ? (
            <FolioPanel
              reservationId={id}
              folio={folioResult.data}
              canManage={actor?.permissions.includes("billing:manage") ?? false}
            />
          ) : (
            <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm">
              {folioResult.error ?? "The folio could not be loaded."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
