import { getSiteContent } from "@/features/site/services/site.service";
import { HOME, type Locale } from "@/lib/i18n/home";
import { PublicHeaderClient } from "./PublicHeaderClient";

/**
 * Server wrapper so the header's contact details come from Site Settings
 * while the menu itself stays an interactive client component.
 *
 * `locale` is passed only by the homepages (/, /de, /fr): it translates the
 * menu and shows the language picker. Inner pages are English-only, so they
 * leave it out and show no picker.
 */
export async function PublicHeader({
  variant = "transparent",
  locale,
}: {
  variant?: "transparent" | "solid";
  locale?: Locale;
}) {
  const { contact } = await getSiteContent();
  return (
    <PublicHeaderClient
      variant={variant}
      phoneDisplay={contact.phoneDisplay}
      email={contact.email}
      t={HOME[locale ?? "en"].nav}
      locale={locale}
    />
  );
}
