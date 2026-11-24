"use client";

import * as React from "react";
import { Bell, CalendarCheck, Mail, Sparkles, Truck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { listFleetAlertsAction } from "@/features/fleet/actions/analytics.actions";
import { loadStaffAlertsAction } from "@/features/notifications/actions/alerts.actions";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "booking" | "enquiry" | "fleet";
  href?: string;
}

const POLL_MS = 60_000;

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** A short two-note chime. Browsers only allow it after the page was clicked once; failures are ignored. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* sound is a nicety */
  }
}

/**
 * The bell in the admin header. Shows what is waiting right now: new website
 * booking requests and unanswered messages (checked every minute while the
 * admin is open), plus fleet alerts. When something new arrives it chimes
 * and, if allowed, pops a desktop notification.
 */
export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [fleetAlerts, setFleetAlerts] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("unsupported");
  const loadedRef = React.useRef(false);
  const seenRef = React.useRef<Set<string> | null>(null);

  // Booking requests and messages: on load, every minute, and when the tab
  // comes back into view.
  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const result = await loadStaffAlertsAction().catch(() => null);
      if (cancelled) return;
      setPermission("Notification" in window ? Notification.permission : "unsupported");
      if (!result?.success || !result.data) return;
      const items: NotificationItem[] = result.data.alerts.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        time: ago(a.createdAt),
        unread: true,
        type: a.kind,
        href: a.href,
      }));
      const previous = seenRef.current;
      const fresh = previous ? items.filter((i) => !previous.has(i.id)) : [];
      seenRef.current = new Set(items.map((i) => i.id));
      setNotifications(items);

      if (fresh.length > 0) {
        chime();
        if ("Notification" in window && Notification.permission === "granted") {
          const first = fresh[0];
          const note = new Notification(fresh.length === 1 ? first.title : `${fresh.length} new booking requests or messages`, {
            body: fresh.length === 1 ? first.description : fresh.map((f) => f.title).slice(0, 3).join("\n"),
            icon: "/brand/logo-128.png",
            tag: "lily-staff-alert",
          });
          note.onclick = () => {
            window.focus();
            if (first.href) window.location.assign(first.href);
          };
        }
      }
    };
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Real fleet alerts (service due, document/licence expiry, rating decline) are
  // pulled on first open rather than on every admin page render. Failures are
  // silent: a role without fleet access simply sees no fleet alerts.
  React.useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;

    listFleetAlertsAction()
      .then((result) => {
        if (!result.success || !result.data) return;
        setFleetAlerts(
          result.data.alerts.slice(0, 10).map((alert) => ({
            id: alert.id,
            title: alert.title,
            description: alert.message,
            time: new Date(alert.createdAt).toLocaleDateString(),
            unread: alert.status === "OPEN",
            type: "fleet" as const,
          }))
        );
      })
      .catch(() => {
        /* Fleet alerts are advisory; never break the header on failure. */
      });
  }, [open]);

  const askPermission = async () => {
    if (!("Notification" in window)) return;
    const answer = await Notification.requestPermission();
    setPermission(answer);
    if (answer === "granted") chime();
  };

  const allNotifications = React.useMemo(
    () => [...fleetAlerts, ...notifications],
    [fleetAlerts, notifications]
  );

  const unreadCount = allNotifications.filter((n) => n.unread).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={unreadCount > 0 ? `Notifications: ${unreadCount} waiting` : "Notifications"}
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white transition-colors cursor-pointer">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 px-4 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="emerald" className="text-[10px] px-1.5 py-0">
                {unreadCount} New
              </Badge>
            )}
          </div>
          {permission === "default" && (
            <button
              onClick={askPermission}
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Turn on desktop alerts
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
          {allNotifications.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-stone-500 dark:text-stone-400">
              All caught up. New booking requests and messages show up here.
            </p>
          )}
          {allNotifications.map((n) => {
            return (
              <a
                key={n.id}
                href={n.href ?? "/admin/safari/fleet"}
                onClick={() => setOpen(false)}
                className={`p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40 flex items-start space-x-3 ${
                  n.unread ? "bg-emerald-950/10 dark:bg-emerald-950/20" : ""
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {n.type === "booking" ? (
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : n.type === "enquiry" ? (
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                  ) : n.type === "fleet" ? (
                    <Truck className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
