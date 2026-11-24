import { getSiteSettings } from "@/features/site/actions/site.actions";
import { SettingsBoard } from "@/features/site/components/SettingsBoard";

export default async function SettingsPage() {
  const result = await getSiteSettings();
  return (
    <SettingsBoard
      settings={result.success && result.data ? result.data : null}
      loadError={result.success ? undefined : result.error}
    />
  );
}
