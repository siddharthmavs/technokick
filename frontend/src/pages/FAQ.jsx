import React, { useState } from "react";
import Header from "../components/Header";
import { Footer } from "./Home";

const FAQS = [
    {
        q: "How do I join the PS5 FIFA tournament?",
        a: "Sign in with your phone + name, accept the rulebook, and register solo — it's an individual 1v1 tournament. Entry is ₹100, paid at the committee desk (TC Building, Ground Floor).",
    },
    {
        q: "How do the groups work?",
        a: "Exactly like the FIFA World Cup! After registrations close, the committee runs a draw and places every player into a group. You play round-robin matches within your group, and the top 2 advance to the knockout stage.",
    },
    {
        q: "When and where are matches played?",
        a: "Matches kick off daily from 7:00 PM IST on the assigned PS5 stations on campus. Check your dashboard for your station and schedule. 6 minutes per half, standard rules.",
    },
    {
        q: "How do daily predictions work?",
        a: "Every day during the World Cup we post up to 4 questions about real matches. The window is open from 10:00 AM to 8:00 PM IST. You can edit your answers any time before the window closes.",
    },
    {
        q: "How is prediction scoring done?",
        a: "Match winner / outcome questions: 10 points. Exact scoreline: +15 bonus on top of the outcome points. Goal scorer picks: 5 points per correct scorer. Yes/No specials: 5 points. Results are declared by the committee after each match.",
    },
    {
        q: "When does my payment show as confirmed?",
        a: "Hand over ₹100 at the committee desk and the organizers will flip your status to PAID. It reflects on your ticket and dashboard immediately after.",
    },
    {
        q: "Can I edit or withdraw my registration?",
        a: "Yes — you can edit your details or withdraw any time until the group draw is published. After the draw, contact the committee directly.",
    },
    {
        q: "What if I don't show up for my match?",
        a: "You get a 5-minute grace period. After that it's a 3-0 walkover for your opponent. Don't be that player.",
    },
    {
        q: "What do winners get?",
        a: "Campus-wide bragging rights, your name on the Hall of Fame, and prizes announced by the committee. The real trophy is the fear in your colleagues' eyes.",
    },
];

export default function FAQ() {
    const [open, setOpen] = useState(0);
    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="stamp stamp-teal">Need-to-know</span>
                        <h1 className="font-heading text-5xl md:text-7xl mt-3 uppercase">The <span className="text-brick">FAQ</span></h1>
                        <p className="font-body opacity-70 mt-2">Everything about TechnoKick 2026, minus the offside rule.</p>
                    </div>

                    <div className="space-y-3" data-testid="faq-list">
                        {FAQS.map((f, i) => (
                            <div key={i} className="retro-card bg-white overflow-hidden">
                                <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3" data-testid={`faq-question-${i}`}>
                                    <span className="font-heading text-lg md:text-xl uppercase leading-tight">{f.q}</span>
                                    <span className={`font-heading text-2xl text-brick transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
                                </button>
                                {open === i && (
                                    <div className="px-5 pb-5 font-body text-sm md:text-base leading-relaxed border-t-2 border-ink/10 pt-3" data-testid={`faq-answer-${i}`}>
                                        {f.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
