"use client";

import { ScrollReveal } from "../ui/ScrollReveal";
import { SITE } from "@/lib/seo/site";

export function LocationSection() {
  return (
    <div className="w-full bg-stone-900 py-24 px-8 lg:px-16 text-stone-100">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-4 block">Location</span>
            <h3 className="text-4xl md:text-5xl font-serif text-white">Find Us in Udawalawe</h3>
            <p className="mt-6 text-stone-400 max-w-2xl mx-auto text-lg leading-relaxed">
              We are a short drive from the Udawalawe National Park entrance, so a morning drive means
              an early start rather than a long one.
            </p>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <ScrollReveal direction="right" delay={0.2} className="lg:col-span-1 space-y-8">
            <div className="bg-stone-800/50 p-8 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
              <h4 className="text-xl font-serif text-white mb-4">Contact Details</h4>
              <ul className="space-y-4 text-stone-300">
                <li className="flex items-start gap-4">
                  <span className="text-emerald-400 text-xl mt-1">📍</span>
                  <span>
                    {SITE.address.street}, {SITE.address.locality} {SITE.address.postalCode}, Sri Lanka
                  </span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-emerald-400 text-xl">📞</span>
                  <span>{SITE.phoneDisplay}</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-emerald-400 text-xl">✉️</span>
                  <span>{SITE.email}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-stone-800/50 p-8 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
              <h4 className="text-xl font-serif text-white mb-4">How to Get Here</h4>
              <p className="text-stone-300 text-sm leading-relaxed mb-4">
                Udawalawa is roughly a four to five hour drive from Bandaranaike International Airport
                (CMB), depending on traffic. Call or email us and we will tell you the best way to
                reach us from wherever you are starting.
              </p>
              <a
                href={`tel:${SITE.phone}`}
                className="text-emerald-400 hover:text-emerald-300 font-medium text-sm tracking-wide uppercase transition-colors group flex items-center gap-2"
              >
                Call Us <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="left" delay={0.4} className="lg:col-span-2 h-[500px] lg:h-[600px] w-full">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-stone-800 relative">
              <iframe 
                src="https://maps.google.com/maps?q=6.420229,80.83551&z=15&output=embed" 
                className="absolute inset-0 w-full h-full"
                style={{ border: 0, filter: "grayscale(80%) contrast(120%) opacity(90%)" }}
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl"></div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
