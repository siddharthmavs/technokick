import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { PS5_REG_DEADLINE, useCountdown } from "../lib/time";
import Countdown from "../components/Countdown";

function MarkdownLite({ text }) {
    return (
        <div className="space-y-2">
            {text.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-1" />;
                const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                return <p key={i} className="font-body text-sm md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
            })}
        </div>
    );
}

export default function PS5Terms() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [accepted, setAccepted] = useState(false);
    const regCd = useCountdown(PS5_REG_DEADLINE);

    useEffect(() => {
        api.get("/settings/tnc").then((r) => setContent(r.data.content)).catch(() => {});
    }, []);

    const proceed = () => {
        if (user) navigate("/ps5/register");
        else navigate("/login?next=/ps5/register");
    };

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <span className="stamp stamp-brick">Step 1 of 2</span>
                        <h1 className="font-heading text-5xl md:text-6xl mt-3 uppercase">The <span className="text-brick">Rulebook</span></h1>
                        <p className="font-body opacity-70 mt-2">Read it. Accept it. Then claim your spot in the draw.</p>
                    </div>

                    {regCd.expired ? (
                        <div className="border-2 border-brick bg-brick/10 p-4 mb-6 flex items-center gap-3" data-testid="reg-closed-banner">
                            <span className="stamp stamp-brick shrink-0">CLOSED</span>
                            <p className="font-body text-sm font-bold">Registration for the PS5 FIFA World Cup has closed. No new entries are being accepted.</p>
                        </div>
                    ) : (
                        <div className="border-2 border-ink bg-mustard p-3 mb-6 flex items-center justify-between gap-3 flex-wrap" data-testid="reg-deadline-banner">
                            <p className="font-mono text-xs uppercase tracking-widest font-bold">⏳ Registration closes · 5 July 2026</p>
                            <Countdown target={PS5_REG_DEADLINE} label="Time left" />
                        </div>
                    )}

                    <div className="retro-card bg-white p-6 md:p-8" data-testid="tnc-content">
                        <MarkdownLite text={content || "Loading the rulebook…"} />
                    </div>

                    <label className="flex items-start gap-3 mt-6 cursor-pointer select-none ticket p-4" data-testid="tnc-accept-label">
                        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 w-5 h-5 accent-[#B33A2B]" data-testid="tnc-accept-checkbox" />
                        <span className="font-body text-sm font-bold">I've read the rulebook and I accept the Terms & Conditions. Bring on the draw!</span>
                    </label>

                    <button onClick={proceed} disabled={!accepted || regCd.expired} className="btn-retro btn-brick w-full mt-6 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="tnc-proceed-btn">
                        {regCd.expired ? "Registration Closed" : "Accept & Register →"}
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
