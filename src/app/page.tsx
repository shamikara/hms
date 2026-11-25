import { HomePage, homeMetadata } from "@/components/landing/HomePage";

export const metadata = homeMetadata("en");

/** Rebuilt at least this often even if no admin change triggers it. */
export const revalidate = 3600;

export default function Page() {
  return <HomePage locale="en" />;
}
