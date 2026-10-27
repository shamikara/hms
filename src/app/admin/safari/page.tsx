import { redirect } from "next/navigation";

/**
 * Safari operations live in the fleet module.
 *
 * This route used to render a second dispatch board from hardcoded data —
 * invented drives, invented vehicles, invented guides, and a "recent
 * sightings" feed with no model behind it at all. The real thing, with real
 * trips, vehicles and drivers, is at /admin/safari/fleet/trips.
 *
 * Kept as a redirect rather than deleted so existing links and bookmarks
 * still land somewhere useful.
 */
export default function SafariOperationsPage() {
  redirect("/admin/safari/fleet/trips");
}
