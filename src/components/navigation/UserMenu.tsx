"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Globe, KeyRound, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import { changeMyPasswordAction, loadMyProfileAction, type MyProfile } from "@/features/auth/actions/profile.actions";

/** The signed-in person in the admin header: their real name, email and role. */
export function UserMenu() {
  const [me, setMe] = React.useState<MyProfile | null>(null);
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadMyProfileAction()
      .then((r) => {
        if (!cancelled && r.success && r.data) setMe(r.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const name = me?.name ?? "";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0]!.toUpperCase())
      .join("")
      .slice(0, 2) || "·";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center space-x-2 rounded-lg p-1 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors cursor-pointer outline-none"
            aria-label={me ? `Account menu for ${me.name}` : "Account menu"}
          >
            <Avatar className="h-7 w-7 border-stone-300 dark:border-stone-700">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-left min-w-[80px]">
              {me ? (
                <>
                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-none">{me.name}</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">{me.role}</span>
                </>
              ) : (
                <>
                  <span className="h-3 w-20 rounded bg-stone-200 dark:bg-stone-800 animate-pulse" />
                  <span className="mt-1 h-2.5 w-14 rounded bg-stone-100 dark:bg-stone-800/60 animate-pulse" />
                </>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal normal-case tracking-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium leading-none text-stone-900 dark:text-stone-100">{me?.name ?? "…"}</p>
              <p className="text-[11px] leading-none text-stone-500 dark:text-stone-400 font-mono break-all">{me?.email ?? ""}</p>
              {me && (
                <div className="pt-1">
                  <Badge variant="emerald" className="text-[9px] px-1.5 py-0">
                    {me.role}
                  </Badge>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
              <KeyRound className="mr-2 h-3.5 w-3.5 text-stone-500" />
              <span>Change password</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-3.5 w-3.5 text-stone-500" />
                <span>Site settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/" target="_blank">
                <Globe className="mr-2 h-3.5 w-3.5 text-stone-500" />
                <span>View website</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40"
            onSelect={() => {
              void logoutAction();
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}

const field =
  "w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 pr-10 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-stone-600 dark:text-stone-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={field}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const [form, setForm] = React.useState(empty);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setForm(empty);
      setError(null);
      setDone(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await changeMyPasswordAction(form);
    setBusy(false);
    if (r.success) {
      setDone(true);
      setForm(empty);
    } else setError(r.error ?? "That did not work.");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change your password</DialogTitle>
          <DialogDescription>Use at least 10 characters. A short sentence you will remember works well.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-4">
            <p role="status" className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
              Password changed. Use the new one next time you sign in.
            </p>
            <button
              type="button"
              onClick={() => close(false)}
              className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <PasswordInput
              id="pw-current"
              label="Current password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(v) => setForm({ ...form, currentPassword: v })}
            />
            <PasswordInput
              id="pw-new"
              label="New password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(v) => setForm({ ...form, newPassword: v })}
              hint="At least 10 characters."
            />
            <PasswordInput
              id="pw-confirm"
              label="New password again"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(v) => setForm({ ...form, confirmPassword: v })}
            />
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm text-stone-600 dark:text-stone-300"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Saving…" : "Change password"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
