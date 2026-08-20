"use client";

import * as React from "react";
import { Bell, Check, Compass, CalendarCheck, ShieldAlert, Sparkles, Truck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listFleetAlertsAction } from "@/features/fleet/actions/analytics.actions";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "booking" | "safari" | "alert" | "system" | "fleet";
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "VIP Check-in Arrival",
    description: "Villa 04 - Mr. Alexander Wright arriving in 30 mins.",
    time: "5m ago",
    unread: true,
    type: "booking",
  },
  {
    id: "notif-2",
    title: "Safari Ranger Alert",
    description: "Leopard spotted near Block 1 - Jeep #04 dispatched.",
    time: "18m ago",
    unread: true,
    type: "safari",
  },
  {
    id: "notif-3",
    title: "Invoice Settlement",
    description: "Reservation #RES-9402 settled via Stripe ($2,450.00).",
    time: "1h ago",
    unread: false,
    type: "system",
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS);
  const [fleetAlerts, setFleetAlerts] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const loadedRef = React.useRef(false);

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

  const allNotifications = React.useMemo(
    () => [...fleetAlerts, ...notifications],
    [fleetAlerts, notifications]
  );

  const unreadCount = allNotifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setFleetAlerts((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white transition-colors cursor-pointer">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
              {unreadCount}
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
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
          {allNotifications.map((n) => {
            return (
              <div
                key={n.id}
                className={`p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40 flex items-start space-x-3 ${
                  n.unread ? "bg-emerald-950/10 dark:bg-emerald-950/20" : ""
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {n.type === "booking" ? (
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : n.type === "safari" ? (
                    <Compass className="h-3.5 w-3.5 text-amber-500" />
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
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
