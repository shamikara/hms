import { z } from "zod";

/**
 * Roles staff can be given, with what each one is for. Names match `Role.name`
 * and the role maps in requireAdminSession.ts, fleet/lib/authz.ts and the
 * proxy, so this list is the one place the admin screen learns them from.
 */
export const STAFF_ROLES = [
  { name: "SUPER_ADMIN", label: "Super admin", hint: "Everything, including other super admins." },
  { name: "GENERAL_MANAGER", label: "General manager", hint: "Everything except super-admin accounts." },
  { name: "RESORT_MANAGER", label: "Resort manager", hint: "Everything except super-admin accounts." },
  { name: "RECEPTIONIST", label: "Receptionist", hint: "Bookings, guests, bills, housekeeping." },
  { name: "FINANCE_OFFICER", label: "Finance officer", hint: "Revenue, bills and payments." },
  { name: "HOUSEKEEPER", label: "Housekeeper", hint: "Marks rooms clean or dirty." },
  { name: "SAFARI_COORDINATOR", label: "Safari coordinator", hint: "Safari trips and the bookings they serve." },
  { name: "FLEET_MANAGER", label: "Fleet manager", hint: "Safari jeeps, drivers, fuel and maintenance." },
  { name: "DRIVER", label: "Driver", hint: "Their own safari trips." },
  { name: "GUIDE", label: "Guide", hint: "Their own safari trips." },
  { name: "RANGER", label: "Ranger", hint: "Safari trips." },
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number]["name"];
const ROLE_NAMES = STAFF_ROLES.map((r) => r.name) as [StaffRoleName, ...StaffRoleName[]];

/** Long enough that length does the work; no composition rules to game. */
const password = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password is too long");

const roles = z
  .array(z.enum(ROLE_NAMES))
  .min(1, "Choose at least one role")
  .transform((list) => [...new Set(list)]);

const name = (what: string) => z.string().trim().min(1, `${what} is required`).max(100);

export const CreateStaffSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password,
  roles,
});

export const UpdateStaffSchema = z.object({
  employeeId: z.string().cuid(),
  firstName: name("First name"),
  lastName: name("Last name"),
  roles,
});

export const ResetPasswordSchema = z.object({
  employeeId: z.string().cuid(),
  password,
});

export const SetActiveSchema = z.object({
  employeeId: z.string().cuid(),
  active: z.boolean(),
});

export type CreateStaffValues = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffValues = z.infer<typeof UpdateStaffSchema>;
