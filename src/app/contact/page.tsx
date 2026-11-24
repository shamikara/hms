import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ContactView } from "@/features/site/components/ContactView";
import { getSiteContent } from "@/features/site/services/site.service";

export default async function ContactPage() {
  const { contact } = await getSiteContent();

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader variant="solid" />
      <ContactView contact={contact} />
      <PublicFooter />
    </div>
  );
}
