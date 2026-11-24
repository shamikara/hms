import { createElement } from "react";
import { requireAdminPermission } from "@/features/admin/lib/requireAdminSession";
import { getDeskReservation } from "@/features/admin/actions/reservations.actions";
import { getFolio } from "@/features/billing/services/folio.service";
import { getSiteContent } from "@/features/site/services/site.service";
import { errorResponse, generatedStamp, pdfResponse } from "@/features/reports/services/render";
import { FolioPdf } from "@/features/reports/pdf/FolioPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /admin/bookings/{id}/bill: the guest's bill as a PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireAdminPermission("finance:view");
  if (!guard.ok) return errorResponse(guard.failure.error, 403);

  // getDeskReservation only finds bookings at this property, so the folio is
  // read only once the booking is known to be ours.
  const reservation = await getDeskReservation(id);
  if (!reservation.success || !reservation.data) return errorResponse("That booking was not found.", 404);
  const r = reservation.data;

  try {
    const [folio, { contact }] = await Promise.all([getFolio(id), getSiteContent()]);
    return pdfResponse(
      createElement(FolioPdf, {
        folio,
        contact,
        generatedAt: generatedStamp(),
        guest: {
          reference: r.reference,
          guestName: r.guestName,
          email: r.email,
          phone: r.phone,
          checkIn: r.checkInDate,
          checkOut: r.checkOutDate,
          nights: r.nights,
          rooms: r.roomNumbers.join(", ") || "-",
        },
      }),
      `wildlily-bill-${r.reference}.pdf`,
    );
  } catch (error) {
    console.error("bill pdf failed:", error instanceof Error ? error.message : error);
    return errorResponse("The bill could not be generated. Please try again.", 500);
  }
}
