"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Inbox, Mail, MessageCircle, Phone, Search, Trash2 } from "lucide-react";
import type { EnquiryRow } from "@/features/enquiries/services/enquiry.service";
import { deleteEnquiry, setEnquiryStatus } from "@/features/enquiries/actions/enquiry.actions";

type Filter = "OPEN" | "NEW" | "REPLIED" | "CLOSED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "OPEN", label: "To do" },
  { value: "NEW", label: "New" },
  { value: "REPLIED", label: "Replied" },
  { value: "CLOSED", label: "Closed" },
  { value: "ALL", label: "All" },
];

const STATUS_STYLE: Record<EnquiryRow["status"], string> = {
  NEW: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-800/30",
  REPLIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-800/30",
  CLOSED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-700/30",
};

const small =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-emerald-600 hover:text-emerald-600 transition-colors disabled:opacity-50";

function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(new Date(iso));
}

export function EnquiriesBoard({
  enquiries,
  loadError,
  canManage,
  canDelete,
}: {
  enquiries: EnquiryRow[];
  loadError?: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        router.refresh();
      } else setError(result.error ?? "That did not work.");
    });
  };

  const counts = useMemo(
    () => ({
      NEW: enquiries.filter((e) => e.status === "NEW").length,
      REPLIED: enquiries.filter((e) => e.status === "REPLIED").length,
    }),
    [enquiries],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return enquiries.filter((e) => {
      const statusOk =
        filter === "ALL" || (filter === "OPEN" ? e.status !== "CLOSED" : e.status === filter);
      const textOk =
        !needle || [e.name, e.email, e.message, e.subject].some((v) => v.toLowerCase().includes(needle));
      return statusOk && textOk;
    });
  }, [enquiries, filter, query]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Enquiries</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
          Messages from the website&apos;s contact page. Each one is also emailed to the reservations
          inbox. Reply, then mark it replied so the team knows it is handled.
        </p>
      </div>

      {(error || loadError) && (
        <div role="alert" className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error ?? loadError}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border transition-colors ${
                filter === f.value
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-stone-200 dark:border-stone-800 text-stone-500 hover:border-stone-300"
              }`}
            >
              {f.label}
              {f.value === "NEW" && counts.NEW > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{counts.NEW}</span>}
            </button>
          ))}
        </div>
        <label className="relative md:w-72">
          <span className="sr-only">Search messages</span>
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, message"
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center">
          <Inbox className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto" />
          <p className="mt-3 text-sm text-stone-500">
            {enquiries.length === 0 ? "No messages yet. They will appear here as guests write in." : "Nothing matches this view."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((e) => {
            const wa = e.phone ? `https://wa.me/${e.phone.replace(/\D/g, "")}` : null;
            return (
              <li key={e.id} className={`bg-white dark:bg-stone-900 border rounded-2xl p-5 sm:p-6 shadow-sm ${e.status === "NEW" ? "border-amber-400/50" : "border-stone-200 dark:border-stone-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-stone-900 dark:text-white">{e.name}</h2>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase border ${STATUS_STYLE[e.status]}`}>{e.status === "NEW" ? "New" : e.status === "REPLIED" ? "Replied" : "Closed"}</span>
                      <span className="text-xs text-stone-500">{e.subject}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {e.email}
                      {e.phone ? ` · ${e.phone}` : ""}
                      {e.travelDates ? ` · Dates: ${e.travelDates}` : ""}
                    </p>
                  </div>
                  <time className="text-xs font-mono text-stone-500 shrink-0" dateTime={e.createdAt}>{when(e.createdAt)}</time>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">{e.message}</p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <a className={small} href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.subject}`)}`}>
                    <Mail className="w-3.5 h-3.5" /> Reply by email
                  </a>
                  {wa && (
                    <a className={small} href={wa} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  {e.phone && (
                    <a className={small} href={`tel:${e.phone.replace(/[^\d+]/g, "")}`}>
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}

                  <span className="flex-1" />

                  {canManage && e.status !== "REPLIED" && (
                    <button disabled={isPending} className={small} onClick={() => run(() => setEnquiryStatus(e.id, "REPLIED"), `Marked ${e.name} as replied.`)}>
                      Mark replied
                    </button>
                  )}
                  {canManage && e.status !== "CLOSED" && (
                    <button disabled={isPending} className={small} onClick={() => run(() => setEnquiryStatus(e.id, "CLOSED"), `Closed ${e.name}'s message.`)}>
                      Close
                    </button>
                  )}
                  {canManage && e.status === "CLOSED" && (
                    <button disabled={isPending} className={small} onClick={() => run(() => setEnquiryStatus(e.id, "NEW"), `Reopened ${e.name}'s message.`)}>
                      Reopen
                    </button>
                  )}
                  {canDelete &&
                    (confirmDelete === e.id ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 pl-2.5 pr-1 py-1 ring-1 ring-red-500/30">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Delete for good?</span>
                        <button
                          disabled={isPending}
                          onClick={() => {
                            setConfirmDelete(null);
                            run(() => deleteEnquiry(e.id), "Message deleted.");
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md text-xs font-semibold"
                        >
                          Yes
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-stone-500 rounded-md text-xs">Keep</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(e.id)}
                        aria-label={`Delete the message from ${e.name}`}
                        title="Delete (spam or test messages)"
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-red-500 hover:border-red-500/50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
