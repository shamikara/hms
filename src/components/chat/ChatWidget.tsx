"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  greeting,
  answer,
  understand,
  handoffMessage,
  whatsappHref,
  ROOMS,
  MAIN_MENU,
  type ChatAnswer,
  type ChatContext,
  type ChatOption,
  type StayOption,
} from "@/lib/chat/chat-script";

interface Message {
  id: number;
  from: "bot" | "guest";
  text: string;
  rooms?: StayOption[];
  options?: ChatOption[];
  handoff?: boolean;
}

/** Human-readable topic labels for the handoff message. */
const TOPIC_LABELS: Record<string, string> = {
  rooms: "rooms",
  rates: "rates",
  safari: "safari drives",
  food: "food",
  breakfast: "breakfast",
  location: "getting here",
  pool: "the pool",
  "booking-ref": "an existing booking",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ChatContext>({ enquiry: {}, topics: [] });
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const push = useCallback((from: Message["from"], reply: ChatAnswer | string) => {
    const id = nextId.current++;
    setMessages((prev) =>
      typeof reply === "string"
        ? [...prev, { id, from, text: reply }]
        : [...prev, { id, from, text: reply.text, rooms: reply.rooms, options: reply.options, handoff: reply.handoff }],
    );
  }, []);

  // Seed the opening message the first time the panel is opened.
  useEffect(() => {
    if (open && messages.length === 0) {
      push("bot", greeting(context));
    }
  }, [open, messages.length, context, push]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const noteTopic = (id: string) => {
    const label = TOPIC_LABELS[id];
    if (!label) return;
    setContext((prev) =>
      prev.topics.includes(label) ? prev : { ...prev, topics: [...prev.topics, label] },
    );
  };

  const choose = (option: ChatOption) => {
    push("guest", option.label);
    noteTopic(option.id);
    push("bot", answer(option.id, context));
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    push("guest", text);
    setInput("");
    push("bot", understand(text, ROOMS));
  };

  const pickRoom = (room: StayOption) => {
    setContext((prev) => ({ ...prev, enquiry: { ...prev.enquiry, roomId: room.id } }));
    push("guest", `I'm interested in the ${room.name}`);
    push("bot", {
      text: `Good choice. The team can confirm availability and the rate for the ${room.name} — shall I pass you across?`,
      options: MAIN_MENU,
      handoff: true,
    });
  };

  const handoffUrl = whatsappHref(handoffMessage(context.topics, context.enquiry));

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close the assistant" : "Open the assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white shadow-2xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-stone-950"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Resort assistant"
          className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[400px] max-h-[min(34rem,calc(100vh-8rem))] flex flex-col rounded-2xl bg-stone-950 border border-stone-800 shadow-2xl overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-stone-850 bg-stone-900/80">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-serif font-bold text-xs flex items-center justify-center">
                W
              </span>
              <div>
                <p className="text-sm font-medium text-white leading-none">Resort Assistant</p>
                <p className="text-[11px] text-stone-500 font-mono mt-1">Answers from confirmed details only</p>
              </div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-none">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2.5">
                <div
                  className={
                    m.from === "guest"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-700 px-3.5 py-2.5 text-sm text-white"
                      : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-stone-900 border border-stone-800 px-3.5 py-2.5 text-sm text-stone-200 whitespace-pre-line"
                  }
                >
                  {m.text}
                </div>

                {m.rooms?.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => pickRoom(room)}
                    className="block w-full text-left rounded-xl border border-stone-800 bg-stone-900/60 px-3.5 py-3 hover:border-emerald-700/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{room.name}</p>
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                      {room.beds} · Sleeps {room.sleeps}
                      {room.view ? ` · ${room.view}` : ""}
                    </p>
                  </button>
                ))}

                {m.handoff && (
                  <a
                    href={handoffUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-sm font-medium text-stone-950 hover:brightness-110 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a13 13 0 0 1-5-3.1 10 10 0 0 1-2-3.3c-.2-.6 0-1.2.3-1.6l.6-.6c.2-.2.5-.2.7.1l1 1.6c.1.3.1.5 0 .7l-.4.5c-.2.2-.2.4 0 .7a8 8 0 0 0 3.2 2.7c.3.1.5.1.7-.1l.6-.7c.2-.2.4-.2.7-.1l1.6.9c.3.2.4.4.3.7Z" />
                    </svg>
                    Continue on WhatsApp
                  </a>
                )}

                {m.options && m.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.options.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => choose(o)}
                        className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-300 hover:border-emerald-600 hover:text-emerald-300 transition-colors"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-stone-850 bg-stone-900/80 px-3 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about rooms, food, safari..."
              aria-label="Ask a question"
              className="flex-1 bg-transparent text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none px-1.5 py-1"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="h-8 w-8 shrink-0 rounded-full bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
