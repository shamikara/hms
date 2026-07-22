import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center">
      <ScrollReveal>
        <div className="text-center max-w-2xl px-4">
          <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-4 block">Get In Touch</span>
          <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">Contact Us</h1>
          <p className="text-stone-500 mb-8 text-lg">
            Our full contact form and guest inquiry system is coming soon. In the meantime, please reach out via reservations@udawalaweresort.com.
          </p>
          <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-500 font-medium tracking-wide uppercase transition-colors group">
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Return Home
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
