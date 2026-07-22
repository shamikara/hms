"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Mail, Phone, MapPin, Clock, Compass, Plane, Car, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "Reservation Inquiry",
    travelDates: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                24/7 Guest Concierge
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Connect with Our Wilderness Desk
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Whether planning a private luxury safari, customizing a villa stay, or arranging airport transfers, our hospitality team is here to assist.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Contact Form */}
          <div className="lg:col-span-7 bg-stone-900/60 p-8 sm:p-10 rounded-2xl border border-stone-800 shadow-2xl">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif text-white">Inquiry Received</h3>
                <p className="text-stone-400 text-sm max-w-md mx-auto">
                  Thank you, <strong className="text-stone-200">{formData.fullName}</strong>. Our guest concierge team has received your message and will contact you via email ({formData.email}) within 4 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-xs text-emerald-400 hover:underline uppercase tracking-wider font-mono"
                >
                  Submit Another Inquiry &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-2xl font-serif text-white">Send a Message</h3>
                  <p className="text-xs text-stone-400 mt-1">Fill in the details below and we will respond promptly.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Alexander Wright"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="alexander@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Phone / WhatsApp</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Inquiry Type</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 cursor-pointer"
                    >
                      <option value="Reservation Inquiry">Villa Reservation Inquiry</option>
                      <option value="Safari Experience">Private Safari & Drives</option>
                      <option value="Airport Transfer">Helicopter / Airport Transfer</option>
                      <option value="Events & Weddings">Events & Private Celebrations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Estimated Travel Dates</label>
                  <input
                    type="text"
                    value={formData.travelDates}
                    onChange={(e) => setFormData({ ...formData, travelDates: e.target.value })}
                    placeholder="e.g. October 15 - October 22, 2026"
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Your Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your trip preferences, dietary requirements, or special requests..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:outline-none text-sm text-stone-100 placeholder:text-stone-600 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50"
                >
                  {loading ? "Sending Message..." : "Send Concierge Request &rarr;"}
                </button>
              </form>
            )}
          </div>

          {/* Right Direct Details & Transfer Info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-stone-900/60 p-8 rounded-2xl border border-stone-800 space-y-6">
              <h3 className="text-xl font-serif text-white">Direct Contacts</h3>
              
              <div className="space-y-4 text-xs">
                <div className="flex items-start space-x-3.5">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Resort Address</strong>
                    <span className="text-stone-400">Udawalawe National Park Road, Thimbolketiya, Sabaragamuwa Province, Sri Lanka</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Reservations Direct</strong>
                    <span className="text-stone-400">+94 47 223 4567 / +94 77 123 8900</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Email Concierge</strong>
                    <span className="text-stone-400">reservations@udawalaweresort.com</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-stone-200 block mb-0.5">Desk Availability</strong>
                    <span className="text-stone-400">24/7 Multilingual Front Desk & Wildlife Concierge</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transfers Card */}
            <div className="bg-stone-900/60 p-8 rounded-2xl border border-stone-800 space-y-4">
              <h3 className="text-lg font-serif text-white">Arrival & Transfers</h3>
              
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start space-x-3">
                  <Plane className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-200 block">Helicopter Charter (35 Mins)</strong>
                    <p className="text-stone-400 mt-0.5">Direct charter from Colombo International Airport (CMB) to our private resort helipad.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start space-x-3">
                  <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-200 block">Luxury SUV Chauffeur (4.5 Hours)</strong>
                    <p className="text-stone-400 mt-0.5">Air-conditioned Range Rover or Mercedes V-Class airport pick-up with cold refreshments.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="h-[400px] w-full border-t border-stone-800 relative">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126938.86877209934!2d80.73031084225028!3d6.480004245638202!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae3f868c679b30b%3A0xc62b7be50d99dc07!2sUdawalawe%20National%20Park!5e0!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk"
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
