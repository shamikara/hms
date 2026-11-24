import { getSiteContent } from "@/features/site/services/site.service";
import { PublicHeaderClient } from "./PublicHeaderClient";

/**
 * Server wrapper so the header's contact details come from Site Settings
 * while the menu itself stays an interactive client component.
 */
export async function PublicHeader({ variant = "transparent" }: { variant?: "transparent" | "solid" }) {
  const { contact } = await getSiteContent();
  return <PublicHeaderClient variant={variant} phoneDisplay={contact.phoneDisplay} email={contact.email} />;
}
