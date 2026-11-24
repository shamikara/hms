import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Compass, LogOut, Phone, ShieldCheck, Star } from "lucide-react";
import { verifySession } from "@/core/lib/session";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import { getGuestAccount, type GuestBooking } from "@/features/auth/services/guest-account.service";
import { getSiteContent } from "@/features/site/services/site.service";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<GuestBooking["status"], string> = {
  "Request received": "bg-amber-100 text-amber-800",
  Confirmed: "bg-emerald-100 text-emerald-800",
  "Staying now": "bg-emerald-700 text-white",
  Completed: "bg-stone-100 text-stone-700",
  Cancelled: "bg-red-50 text-red-700",
  "No-show": "bg-stone-100 text-stone-500",
};

function day(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await verifySession();
  if (!session) redirect("/login?next=/account");

  const [{ welcome }, account, { contact }] = await Promise.all([searchParams, getGuestAccount(session.userId), getSiteContent()]);
  if (!account) redirect("/login");

  const upcoming = account.bookings.filter((b) => b.upcoming);
  const past = account.bookings.filter((b) => !b.upcoming);

  const BookingCard = ({ b }: { b: GuestBooking }) => (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-stone-900/5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl text-stone-900">{b.rooms.join(", ") || "Room to be assigned"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
            <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden />
            {day(b.checkIn)} &rarr; {day(b.checkOut)} · {b.nights} night{b.nights === 1 ? "" : "s"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{b.status}</span>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Reference <span className="font-mono font-semibold text-stone-700">{b.reference}</span>
        {b.status === "Request received" && " · We'll be in touch to confirm."}
      </p>
    </li>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f1e8]">
      <PublicHeader variant="solid" />
      <main className="flex-1 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {welcome && (
            <div role="status" className="rounded-2xl bg-emerald-800 px-6 py-5 text-white">
              <p className="font-serif text-2xl">Welcome, {account.firstName || "and thank you"}! &#x1F33F;</p>
              <p className="mt-1 text-sm text-emerald-100">Your email is confirmed and your account is ready.</p>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Your account</p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">
                {account.firstName ? `Hello, ${account.firstName}` : "Hello"}
              </h1>
              <p className="mt-1 text-sm text-stone-600">{account.email}</p>
            </div>
            <form action={logoutAction}>
              <button className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>

          {account.isStaff && (
            <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-2xl bg-[#13291f] px-6 py-4 text-white hover:bg-[#1a3a2b]">
              <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden />
              <span className="font-medium">You&apos;re signed in as staff. Open the admin panel &rarr;</span>
            </Link>
          )}

          <section>
            <h2 className="mb-4 font-serif text-2xl text-stone-900">Upcoming stays</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center">
                <p className="text-stone-600">No upcoming stays.</p>
                <Link href="/book" className="mt-4 inline-flex rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  Check availability
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">{upcoming.map((b) => <BookingCard key={b.reference} b={b} />)}</ul>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Link href="/safari/review" className="group rounded-2xl bg-white p-6 ring-1 ring-stone-900/5 shadow-sm hover:ring-emerald-600/40">
              <Star className="h-5 w-5 text-amber-500" aria-hidden />
              <p className="mt-3 font-semibold text-stone-900">Rate your safari driver</p>
              <p className="mt-1 text-sm text-stone-600">
                {account.reviewableTrips > 0
                  ? `${account.reviewableTrips} drive${account.reviewableTrips === 1 ? "" : "s"} waiting for your rating.`
                  : "After a game drive with us, you can rate the driver and jeep here."}
              </p>
            </Link>
            <a href={`tel:${contact.phone}`} className="rounded-2xl bg-white p-6 ring-1 ring-stone-900/5 shadow-sm hover:ring-emerald-600/40">
              <Phone className="h-5 w-5 text-emerald-700" aria-hidden />
              <p className="mt-3 font-semibold text-stone-900">Need to change a booking?</p>
              <p className="mt-1 text-sm text-stone-600">Call or WhatsApp {contact.phoneDisplay}, or reply to your booking email.</p>
            </a>
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl text-stone-900">
                <Compass className="h-5 w-5 text-emerald-700" aria-hidden /> Past and cancelled
              </h2>
              <ul className="space-y-3">{past.map((b) => <BookingCard key={b.reference} b={b} />)}</ul>
            </section>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
