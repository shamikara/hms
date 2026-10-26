"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Mail, Phone, MapPin, Clock, Car } from "lucide-react";
import { SITE } from "@/lib/seo/site";

const SUBJECTS = [
  "Room enquiry",
  "Safari drive",
  "Food or dietary requirements",
  "Something else",
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: SUBJECTS[0],
    travelDates: "",
    message: "",
  });

  /**
   * Hands the message to the guest's own email client.
   *
   * There is no mail service wired up yet, so a form that posted somewhere
   * would be a form that silently dropped what people wrote. A mailto at least
   * ends with the message in a place a person reads — and the guest can see
   * for themselves that it was sent.
   */
  const mailtoHref = () => {
    const lines: string[] = [];
    if (formData.travelDates.trim()) lines.push(`Dates: ${formData.travelDates}`);
    if (formData.phone.trim()) lines.push(`Phone: ${formData.phone}`);
    if (lines.length > 0) lines.push("");
    lines.push(formData.message);

    return `mailto:${SITE.email}?subject=${encodeURIComponent(
      `${formData.subject}${formData.fullName ? ` — ${formData.fullName}` : ""}`,
    )}&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  const canSend = formData.fullName.trim() !== "" && formData.message.trim() !== "";

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors";

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                Front Desk 7:00am &ndash; 7:00pm
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Talk to Us
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Phone or WhatsApp is the fastest way to reach the house. The team speak English.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Message composer */}
          <div className="lg:col-span-7 bg-stone-900/60 p-8 sm:p-10 rounded-2xl border border-stone-800 shadow-2xl">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-white">Write Us a Message</h2>
                <p className="text-xs text-stone-400 mt-1">
                  Filling this in opens the message in your own email app, addressed to us. Nothing is
                  sent until you press send there.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">What About?</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Your Dates</label>
                  <input
                    type="text"
                    value={formData.travelDates}
                    onChange={(e) => setFormData({ ...formData, travelDates: e.target.value })}
                    placeholder="e.g. 15 - 22 October"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Message *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How many of you, what you need, anything we should know..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <a
                href={canSend ? mailtoHref() : undefined}
                aria-disabled={!canSend}
                className={`w-full py-4 rounded-xl text-white font-medium text-xs uppercase tracking-widest transition-colors shadow-lg flex items-center justify-center gap-2 ${
                  canSend
                    ? "bg-emerald-700 hover:bg-emerald-600"
                    : "bg-emerald-900/50 opacity-50 cursor-not-allowed pointer-events-none"
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Open in Your Email App</span>
              </a>

              <p className="text-[11px] text-stone-500 text-center">
                No email app on this device? Write to{" "}
                <a href={`mailto:${SITE.email}`} className="text-emerald-400 hover:underline">
                  {SITE.email}
                </a>{" "}
                or call {SITE.phoneDisplay}.
              </p>
            </form>
          </div>

          {/* Direct details */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-stone-900/60 p-8 rounded-2xl border border-stone-800 space-y-6">
              <h3 className="text-xl font-serif text-white">Direct Contacts</h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start space-x-3.5">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Address</strong>
                    <span className="text-stone-400">
                      {SITE.address.street}, {SITE.address.locality} {SITE.address.postalCode},{" "}
                      {SITE.address.region}, Sri Lanka
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Phone &amp; WhatsApp</strong>
                    <a href={`tel:${SITE.phone}`} className="text-stone-400 hover:text-emerald-400 transition-colors">
                      {SITE.phoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Email</strong>
                    <a href={`mailto:${SITE.email}`} className="text-stone-400 hover:text-emerald-400 transition-colors">
                      {SITE.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Front Desk Hours</strong>
                    <span className="text-stone-400">7:00am to 7:00pm daily</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting here */}
            <div className="bg-stone-900/60 p-8 rounded-2xl border border-stone-800 space-y-4">
              <h3 className="text-lg font-serif text-white">Getting Here</h3>

              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start space-x-3 text-xs">
                <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200 block">By Road from Colombo</strong>
                  <p className="text-stone-400 mt-0.5">
                    Roughly four to five hours from Bandaranaike International Airport (CMB),
                    depending on traffic. There is free private parking on site.
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">
                Ask us when you book and we will talk you through the best route, or help you find a
                driver for the trip down.
              </p>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="h-[400px] w-full border-t border-stone-800 relative">
          <iframe
            title="Map showing the location of Wildlily Safari Resort"
            src={`https://maps.google.com/maps?q=${SITE.geo.latitude},${SITE.geo.longitude}&z=15&output=embed`}
            className="w-full h-full border-0"
            style={{ filter: "grayscale(80%) contrast(120%) opacity(90%)" }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
