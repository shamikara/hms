"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, KeyRound, Pencil, Plus, Power, UserCog, X } from "lucide-react";
import type { StaffMember } from "@/features/staff/services/staff.service";
import { STAFF_ROLES } from "@/features/staff/validations/staff.schema";
import {
  createStaff,
  resetStaffPassword,
  setStaffActive,
  updateStaff,
} from "@/features/staff/actions/staff.actions";

type Action = () => Promise<{ success: boolean; error?: string }>;

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";
const card =
  "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm";
const primary =
  "px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors";
const secondary =
  "px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors";
const iconButton =
  "p-2 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:pointer-events-none";

const ROLE_LABEL = new Map<string, string>(STAFF_ROLES.map((r) => [r.name, r.label]));

type Panel =
  | { kind: "create" }
  | { kind: "edit"; member: StaffMember }
  | { kind: "password"; member: StaffMember }
  | null;

export function StaffBoard({
  staff,
  loadError,
  canGrantSuperAdmin,
}: {
  staff: StaffMember[] | null;
  loadError?: string;
  /** Only a super admin may create, change or switch off super-admin accounts. */
  canGrantSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = (action: Action, message: string, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        onDone?.();
        router.refresh();
      } else {
        setError(result.error ?? "That did not save.");
      }
    });
  };

  const lockedSuperAdmin = (m: StaffMember) => m.roles.includes("SUPER_ADMIN") && !canGrantSuperAdmin;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Staff &amp; Access</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Who can sign in to the admin panel, and what each person can do there. Switching someone
            off takes effect on their next click.
          </p>
        </div>
        <button onClick={() => setPanel({ kind: "create" })} className={`${primary} flex items-center gap-1.5`}>
          <Plus className="w-3.5 h-3.5" /> Add staff
        </button>
      </div>

      {(error || loadError) && (
        <div role="alert" className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error ?? loadError}</span>
        </div>
      )}

      {panel?.kind === "create" && (
        <StaffForm
          title="Add a staff member"
          canGrantSuperAdmin={canGrantSuperAdmin}
          busy={isPending}
          onCancel={() => setPanel(null)}
          onSubmit={(values) =>
            run(() => createStaff(values), `Added ${values.firstName}.`, () => setPanel(null))
          }
        />
      )}

      {panel?.kind === "edit" && (
        <StaffForm
          key={panel.member.employeeId}
          title={`Edit ${panel.member.firstName} ${panel.member.lastName}`}
          initial={panel.member}
          canGrantSuperAdmin={canGrantSuperAdmin}
          busy={isPending}
          onCancel={() => setPanel(null)}
          onSubmit={(values) =>
            run(
              () => updateStaff({ employeeId: panel.member.employeeId, ...values }),
              `Saved ${values.firstName}.`,
              () => setPanel(null),
            )
          }
        />
      )}

      {panel?.kind === "password" && (
        <PasswordForm
          key={panel.member.employeeId}
          member={panel.member}
          busy={isPending}
          onCancel={() => setPanel(null)}
          onSubmit={(password) =>
            run(
              () => resetStaffPassword({ employeeId: panel.member.employeeId, password }),
              `New password set for ${panel.member.firstName}. Tell them in person or by phone.`,
              () => setPanel(null),
            )
          }
        />
      )}

      <section className={`${card} overflow-hidden`}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
          <UserCog className="w-4 h-4 text-emerald-500" />
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Staff</h2>
          <span className="text-xs text-stone-500 font-mono">{staff?.length ?? 0}</span>
        </header>

        {staff && staff.length === 0 && (
          <p className="p-6 text-sm text-stone-500">No staff yet. Add the first person above.</p>
        )}

        {staff && staff.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-stone-500 border-b border-stone-200 dark:border-stone-800">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Roles</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.employeeId} className={`border-b border-stone-100 dark:border-stone-800/60 last:border-0 ${m.active ? "" : "opacity-60"}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900 dark:text-white">
                        {m.firstName} {m.lastName}
                        {m.isSelf && <span className="ml-2 text-[10px] font-mono uppercase text-emerald-600">You</span>}
                      </div>
                      <div className="text-xs text-stone-500">{m.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {m.roles.length === 0 && <span className="text-xs text-stone-500">No roles here</span>}
                        {m.roles.map((r) => (
                          <span key={r} className="px-2 py-0.5 rounded-md text-[11px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {ROLE_LABEL.get(r) ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${m.active ? "text-emerald-600 dark:text-emerald-400" : "text-stone-500"}`}>
                        {m.active ? "Active" : "Switched off"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          className={iconButton}
                          disabled={lockedSuperAdmin(m)}
                          onClick={() => setPanel({ kind: "edit", member: m })}
                          aria-label={`Edit ${m.firstName} ${m.lastName}`}
                          title="Edit name and roles"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className={iconButton}
                          disabled={lockedSuperAdmin(m)}
                          onClick={() => setPanel({ kind: "password", member: m })}
                          aria-label={`Set a new password for ${m.firstName} ${m.lastName}`}
                          title="Set a new password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          className={iconButton}
                          disabled={lockedSuperAdmin(m) || (m.isSelf && m.active) || isPending}
                          onClick={() =>
                            run(
                              () => setStaffActive({ employeeId: m.employeeId, active: !m.active }),
                              m.active ? `${m.firstName} can no longer sign in.` : `${m.firstName} can sign in again.`,
                            )
                          }
                          aria-label={m.active ? `Switch off ${m.firstName}'s sign-in` : `Switch ${m.firstName}'s sign-in back on`}
                          title={m.active ? "Switch off sign-in" : "Switch sign-in back on"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StaffForm({
  title,
  initial,
  canGrantSuperAdmin,
  busy,
  onCancel,
  onSubmit,
}: {
  title: string;
  initial?: StaffMember;
  canGrantSuperAdmin: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: { firstName: string; lastName: string; email: string; password: string; roles: string[] }) => void;
}) {
  const editing = Boolean(initial);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);

  const toggle = (name: string) =>
    setRoles((list) => (list.includes(name) ? list.filter((r) => r !== name) : [...list, name]));

  return (
    <form
      className={`${card} p-6 space-y-5`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ firstName, lastName, email, password, roles });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-stone-900 dark:text-white">{title}</h3>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="staff-first" className={label}>First name</label>
          <input id="staff-first" className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="staff-last" className={label}>Last name</label>
          <input id="staff-last" className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        {!editing && (
          <>
            <div>
              <label htmlFor="staff-email" className={label}>Email (their sign-in)</label>
              <input id="staff-email" type="email" autoComplete="off" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="staff-password" className={label}>Starting password</label>
              <input id="staff-password" type="password" autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-[11px] text-stone-500 mt-1">At least 12 characters. Give it to them in person.</p>
            </div>
          </>
        )}
      </div>

      <fieldset>
        <legend className={label}>Roles</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {STAFF_ROLES.map((role) => {
            const locked = role.name === "SUPER_ADMIN" && !canGrantSuperAdmin;
            return (
              <label
                key={role.name}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                  roles.includes(role.name)
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-600"
                  checked={roles.includes(role.name)}
                  disabled={locked}
                  onChange={() => toggle(role.name)}
                />
                <span>
                  <span className="block font-medium text-stone-900 dark:text-white">{role.label}</span>
                  <span className="block text-xs text-stone-500">{role.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
        <button type="submit" disabled={busy} className={primary}>{editing ? "Save" : "Add staff member"}</button>
      </div>
    </form>
  );
}

function PasswordForm({
  member,
  busy,
  onCancel,
  onSubmit,
}: {
  member: StaffMember;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  return (
    <form
      className={`${card} p-6 space-y-4 max-w-lg`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(password);
      }}
    >
      <h3 className="font-serif text-lg text-stone-900 dark:text-white">
        New password for {member.firstName} {member.lastName}
      </h3>
      <div>
        <label htmlFor="reset-password" className={label}>New password</label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          className={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-[11px] text-stone-500 mt-1">At least 12 characters. Their old password stops working.</p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
        <button type="submit" disabled={busy} className={primary}>Set password</button>
      </div>
    </form>
  );
}
