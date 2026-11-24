"use client";

import { useState, useTransition } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Mail, Phone, MapPin, Clock, Car, CheckCircle2, Send, AlertTriangle } from "lucide-react";
import { SITE } from "@/lib/seo/site";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { ENQUIRY_SUBJECTS } from "@/features/enquiries/validations/enquiry.schema";
import { submitEnquiry } from "@/features/enquiries/actions/enquiry.actions";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  subject: ENQUIRY_SUBJECTS[0] as string,
  travelDates: "",
  message: "",
  /** Honeypot: hidden from people; bots fill it in. */
  website: "",
};

/** The contact page body: the message form and the house's details. */
export function ContactView({ contact }: { contact: ContactValues }) {
  const [formData, setFormData] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const canSend =
    formData.name.trim() !== "" && formData.email.trim() !== "" && formData.message.trim() !== "";

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitEnquiry(formData);
      if (result.success) {
        setSentTo(formData.email.trim());
        setFormData(EMPTY);
      } else {
        setError(result.error ?? "Your message could not be sent. Please try again.");
      }
    });
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors";

  return (
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
          <div className="relative lg:col-span-7 bg-stone-900/60 p-8 sm:p-10 rounded-2xl border border-stone-800 shadow-2xl">
            {sentTo ? (
              <div className="py-10 text-center space-y-4" role="status">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h2 className="text-2xl font-serif text-white">Thank you, your message is on its way</h2>
                <p className="text-sm text-stone-400 max-w-md mx-auto">
                  We usually reply within a day. A copy is on its way to <span className="text-stone-200">{sentTo}</span>{" "}
                  (check the spam folder if you don&apos;t see it). For anything urgent, call or WhatsApp{" "}
                  <a href={`tel:${contact.phone}`} className="text-emerald-400 hover:underline">{contact.phoneDisplay}</a>.
                </p>
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="mt-2 px-5 py-2.5 rounded-xl border border-stone-700 text-xs font-medium text-stone-300 hover:border-emerald-600 hover:text-emerald-400 transition-colors"
                >
                  Write another message
                </button>
              </div>
            ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend && !isPending) send();
              }}
              className="space-y-6"
              noValidate
            >
              <div>
                <h2 className="text-2xl font-serif text-white">Write Us a Message</h2>
                <p className="text-xs text-stone-400 mt-1">
                  It goes straight to the team at the house, and we&apos;ll reply by email.
                </p>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-mono uppercase text-stone-400 mb-2">Your Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-mono uppercase text-stone-400 mb-2">Email *</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="So we can reply"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-mono uppercase text-stone-400 mb-2">Phone / WhatsApp</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-mono uppercase text-stone-400 mb-2">What About?</label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {ENQUIRY_SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-dates" className="block text-xs font-mono uppercase text-stone-400 mb-2">Your Dates</label>
                  <input
                    id="contact-dates"
                    type="text"
                    value={formData.travelDates}
                    onChange={(e) => setFormData({ ...formData, travelDates: e.target.value })}
                    placeholder="e.g. 15 - 22 October"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-mono uppercase text-stone-400 mb-2">Message *</label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How many of you, what you need, anything we should know..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={!canSend || isPending}
                className="w-full py-4 rounded-xl text-white font-medium text-xs uppercase tracking-widest transition-colors shadow-lg flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>{isPending ? "Sending..." : "Send Message"}</span>
              </button>

              <p className="text-[11px] text-stone-500 text-center">
                Prefer email? Write to{" "}
                <a href={`mailto:${contact.email}`} className="text-emerald-400 hover:underline">
                  {contact.email}
                </a>{" "}
                or call {contact.phoneDisplay}.
              </p>
            </form>
            )}
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
                      {contact.street}, {contact.locality} {contact.postalCode},{" "}
                      {contact.region}, Sri Lanka
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Phone &amp; WhatsApp</strong>
                    <a href={`tel:${contact.phone}`} className="text-stone-400 hover:text-emerald-400 transition-colors">
                      {contact.phoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Email</strong>
                    <a href={`mailto:${contact.email}`} className="text-stone-400 hover:text-emerald-400 transition-colors">
                      {contact.email}
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
            title="Map showing the location of Lily Safari Resort"
            src={`https://maps.google.com/maps?q=${SITE.geo.latitude},${SITE.geo.longitude}&z=15&output=embed`}
            className="w-full h-full border-0"
            style={{ filter: "grayscale(80%) contrast(120%) opacity(90%)" }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </main>
  );
}
