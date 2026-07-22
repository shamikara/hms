"use client";

import { ScrollReveal } from "../ui/ScrollReveal";

export function LocationSection() {
  return (
    <div className="w-full bg-stone-900 py-24 px-8 lg:px-16 text-stone-100">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-4 block">Location</span>
            <h3 className="text-4xl md:text-5xl font-serif text-white">Find Us in Udawalawe</h3>
            <p className="mt-6 text-stone-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Situated right on the edge of the world-renowned Udawalawe National Park, our luxury resort offers unparalleled access to Sri Lanka's finest elephant viewing experiences.
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
                  <span>Udawalawe National Park Road, Thimbolketiya, Sri Lanka</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-emerald-400 text-xl">📞</span>
                  <span>+94 47 223 4567</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-emerald-400 text-xl">✉️</span>
                  <span>reservations@udawalaweresort.com</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-stone-800/50 p-8 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
              <h4 className="text-xl font-serif text-white mb-4">How to Get Here</h4>
              <p className="text-stone-300 text-sm leading-relaxed mb-4">
                We are located a 4.5-hour drive from Bandaranaike International Airport (CMB) in Colombo. Private transfers can be arranged upon request.
              </p>
              <button className="text-emerald-400 hover:text-emerald-300 font-medium text-sm tracking-wide uppercase transition-colors group flex items-center gap-2">
                Arrange Transfer <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="left" delay={0.4} className="lg:col-span-2 h-[500px] lg:h-[600px] w-full">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-stone-800 relative">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126938.86877209934!2d80.73031084225028!3d6.480004245638202!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae3f868c679b30b%3A0xc62b7be50d99dc07!2sUdawalawe%20National%20Park!5e0!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk" 
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
