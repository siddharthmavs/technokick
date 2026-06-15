import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Marquee from "../components/Marquee";
import Countdown from "../components/Countdown";
import PushPrompt from "../components/PushPrompt";
import { BracketView, GroupStandings } from "../components/PS5";
import { nextPS5Kickoff, predictionWindowClose, isPredictionWindowOpen } from "../lib/time";
import api from "../lib/api";
import { useAuth } from "../lib/auth";

const stadiumImg = "https://images.pexels.com/photos/1657324/pexels-photo-1657324.jpeg?auto=compress&cs=tinysrgb&w=1200";

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [standings, setStandings] = useState([]);
    const [view, setView] = useState("bracket"); // 'bracket' | 'standings'

    useEffect(() => {
        api.get("/ps5/matches").then((r) => setMatches(r.data)).catch(() => {});
        api.get("/announcements").then((r) => setAnnouncements(r.data)).catch(() => {});
        api.get("/ps5/points-table").then((r) => setStandings(r.data)).catch(() => {});
    }, []);

    const liveMatch = matches.find((m) => m.status === "live");
    const upcoming = matches.find((m) => m.status === "upcoming");

    const onPS5Click = () => {
        if (!user) navigate("/login?next=/ps5/terms");
        else navigate("/ps5/terms");
    };
    const onPredictClick = () => {
        if (!user) navigate("/login?next=/predict");
        else navigate("/predict");
    };

const marqueeItems = announcements.length > 0
  ? [
      ...announcements.map((a) => `${a.title} — ${a.body}`),
      "Messi is the GOAT 🐐",
    ]
  : [
      "TechnoKick 2026 is LIVE",
      "Register solo for the PS5 FIFA Cup",
      "Submit daily predictions before 8PM IST",
    ];

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <PushPrompt />
            <Marquee items={marqueeItems} />

            {/* HERO */}
            <section className="relative overflow-hidden border-b-2 border-ink">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${"/bgwc1.jpg"})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'sepia(0.6) contrast(1.2)' }} />
                <div className="absolute inset-0 halftone-light pointer-events-none" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="stamp stamp-brick" data-testid="hero-tag">FIFA WORLD CUP · 2026</span>
                        <span className="stamp">TECHNOPARK CAMPUS</span>
                    </div>
                    <h1 className="font-heading text-6xl md:text-8xl lg:text-9xl leading-[0.85] uppercase text-ink">
                        Play <span className="text-brick">Hard.</span><br/>
                        Predict <span className="text-teal">Bold.</span><br/>
                        Win <span className="underline-wiggle">Big.</span>
                    </h1>
                    <p className="mt-6 font-body text-lg md:text-xl max-w-2xl text-ink/80">
                        The inter-company FIFA showdown for Technopark. Get drawn into a group, conquer the PS5 knockouts, and crush daily predictions for campus glory.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3 items-center">
                        <Countdown target={nextPS5Kickoff()} label="Next kickoff in" />
                        <span className="font-mono text-xs uppercase tracking-widest opacity-70">· 7:00 PM IST</span>
                    </div>
                </div>
                {/* world cup trophy poster sticker */}
                <div className="hidden md:block absolute bottom-6 right-6 rotate-[3deg]">
                    <div className="relative border-4 border-ink shadow-retro-lg bg-white p-2 pb-8">
                        <img src="/world-cup-2026.png" alt="The World Cup trophy" className="w-56 h-64 object-cover" data-testid="hero-trophy-img" />
                        <div className="absolute bottom-1 left-0 right-0 text-center font-heading uppercase tracking-widest text-ink text-lg">The Cup · 2026</div>
                        <span className="stamp stamp-brick absolute -top-3 -left-3 rotate-[-8deg]">WIN IT</span>
                    </div>
                </div>
            </section>

            {/* TWO HERO CARDS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PS5 Card */}
                    <button onClick={onPS5Click} className="text-left retro-card retro-card-hover p-6 md:p-8 relative overflow-hidden group" data-testid="ps5-card">
                        <div className="absolute top-4 right-4 stamp stamp-brick rotate-[8deg]">PS5 · FIFA</div>
                        <div className="halftone-bg absolute -left-6 -bottom-6 w-32 h-32 opacity-60 rotate-12" />
                        <div className="relative">
                            <h2 className="font-heading text-4xl md:text-6xl leading-none uppercase">PS5 FIFA<br/>World Cup</h2>
                            <p className="mt-4 font-body text-ink/80">Solo 1v1 showdown. Get drawn into a group — top your table, survive the knockouts. ₹100 entry.</p>
                            <div className="mt-6 flex items-center justify-between">
                                <Countdown target={nextPS5Kickoff()} label="Kick-off" />
                                <span className="btn-retro btn-brick !py-2 !px-4 !text-sm">Register →</span>
                            </div>
                        </div>
                    </button>

                    {/* Prediction Card */}
                    <button onClick={onPredictClick} className="text-left retro-card retro-card-hover p-6 md:p-8 relative overflow-hidden bg-mustard" data-testid="predict-card">
                        <div className="absolute top-4 right-4 stamp stamp-teal rotate-[8deg]">DAILY · LIVE</div>
                        <div className="absolute inset-0 stripes-bg opacity-[0.06]" />
                        <div className="relative">
                            <h2 className="font-heading text-4xl md:text-6xl leading-none uppercase text-ink">Daily<br/>Prediction</h2>
                            <p className="mt-4 font-body text-ink/80">4 questions a day on real World Cup matches. Window: 10AM–8PM IST. Score = glory.</p>
                            <div className="mt-6 flex items-center justify-between">
                                <Countdown target={predictionWindowClose()} label={isPredictionWindowOpen() ? "Closes in" : "Opens in"} />
                                <span className="btn-retro btn-ink !py-2 !px-4 !text-sm">Play →</span>
                            </div>
                        </div>
                    </button>
                </div>
            </section>

            {/* LIVE BANNER */}
            {liveMatch && (
                <section className="border-y-2 border-ink bg-brick text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="font-heading text-2xl tracking-wider uppercase"><span className="live-dot" />LIVE NOW</span>
                            <span className="font-body uppercase tracking-wide">{liveMatch.player_a} vs {liveMatch.player_b}</span>
                            <span className="stamp">{liveMatch.round_label || "Match"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="scoreboard">{liveMatch.score_a} : {liveMatch.score_b}</span>
                            <span className="font-mono text-xs">{liveMatch.station}</span>
                        </div>
                    </div>
                </section>
            )}

            {/* BRACKET / STANDINGS TOGGLE */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
                <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
                    <h2 className="font-heading text-4xl md:text-5xl uppercase">Tournament <span className="text-brick">{view === "bracket" ? "Wall Chart" : "Standings"}</span></h2>
                    <div className="inline-flex border-2 border-ink shadow-retro-sm">
                        <button onClick={() => setView("bracket")} data-testid="view-bracket-btn" className={`px-4 py-2 font-heading text-sm uppercase tracking-wider ${view === "bracket" ? "bg-ink text-mustard" : "bg-white"}`}>Matches</button>
                        <button onClick={() => setView("standings")} data-testid="view-points-btn" className={`px-4 py-2 font-heading text-sm uppercase tracking-wider border-l-2 border-ink ${view === "standings" ? "bg-ink text-mustard" : "bg-white"}`}>Group Standings</button>
                    </div>
                </div>

                {view === "bracket" ? <BracketView matches={matches} /> : <GroupStandings standings={standings} />}
            </section>

            {/* UPCOMING SLOT */}
            {upcoming && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                    <div className="ticket p-6 mx-2 md:mx-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Next Up</div>
                                <div className="font-heading text-2xl md:text-3xl">{upcoming.player_a} <span className="text-brick">vs</span> {upcoming.player_b}</div>
                                <div className="font-body text-sm opacity-70">{upcoming.round_label} · {upcoming.station} · {new Date(upcoming.scheduled_at).toLocaleString()}</div>
                            </div>
                            <span className="stamp stamp-teal">Upcoming</span>
                        </div>
                    </div>
                </section>
            )}

            <Footer />
        </div>
    );
}

export function Footer() {
    return (
        <footer className="border-t-2 border-ink bg-ink text-cream py-8 relative z-10" data-testid="site-footer">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-5">
                <div>
                    <div className="font-heading text-2xl">TECHNOKICK · 2026</div>
                    <div className="font-mono text-xs uppercase tracking-widest opacity-70">Made with ⚽ for the Technopark campus</div>
                </div>
                <a href="mailto:hr@mav-s.com" className="group" data-testid="helpdesk-link">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Games Help Desk · Committee</div>
                    <div className="font-body font-bold text-mustard underline group-hover:text-cream">hr@mav-s.com</div>
                </a>
                <div className="flex items-center gap-3 border-l-2 border-cream/20 pl-5" data-testid="mavs-branding">
                    <img src="/mavs-logo.png" alt="MAV-S Innovation" className="h-10 w-10 object-cover object-left border-2 border-cream/30" />
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-80 leading-relaxed">Presented by<br /><span className="text-mustard font-bold">MAV-S Innovation</span></div>
                </div>
            </div>
        </footer>
    );
}
