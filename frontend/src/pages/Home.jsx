import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Marquee from "../components/Marquee";
import Countdown from "../components/Countdown";
import { nextPS5Kickoff, predictionWindowClose, isPredictionWindowOpen } from "../lib/time";
import api from "../lib/api";
import { useAuth } from "../lib/auth";

const heroFootball = "https://images.pexels.com/photos/10821308/pexels-photo-10821308.jpeg?auto=compress&cs=tinysrgb&w=800";
const stadiumImg = "https://images.pexels.com/photos/1657324/pexels-photo-1657324.jpeg?auto=compress&cs=tinysrgb&w=1200";

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [points, setPoints] = useState([]);
    const [view, setView] = useState("bracket"); // 'bracket' | 'points'

    useEffect(() => {
        api.get("/ps5/matches").then((r) => setMatches(r.data)).catch(() => {});
        api.get("/announcements").then((r) => setAnnouncements(r.data)).catch(() => {});
        api.get("/ps5/points-table").then((r) => setPoints(r.data)).catch(() => {});
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
        ? announcements.map((a) => `${a.title} — ${a.body}`)
        : ["TechnoKick 2026 is LIVE", "Register your team for PS5 FIFA Cup", "Submit daily predictions before 8PM IST"];

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <Marquee items={marqueeItems} />

            {/* HERO */}
            <section className="relative overflow-hidden border-b-2 border-ink">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${stadiumImg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'sepia(0.6) contrast(1.2)' }} />
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
                        The inter-company FIFA showdown for Technopark. Conquer the PS5 bracket. Crush daily predictions. Earn bragging rights for your team.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3 items-center">
                        <Countdown target={nextPS5Kickoff()} label="Next kickoff in" />
                        <span className="font-mono text-xs uppercase tracking-widest opacity-70">· 7:00 PM IST</span>
                    </div>
                </div>
                {/* floating ball sticker */}
                <img src={heroFootball} alt="" className="hidden md:block absolute -bottom-10 -right-10 w-64 h-64 object-cover rounded-full border-4 border-ink shadow-retro-lg ball-spin" />
            </section>

            {/* TWO HERO CARDS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PS5 Card */}
                    <button onClick={onPS5Click} className="text-left retro-card retro-card-hover p-6 md:p-8 relative overflow-hidden group" data-testid="ps5-card">
                        <div className="absolute -top-4 -right-4 stamp stamp-brick rotate-[8deg]">PS5 · FIFA</div>
                        <div className="halftone-bg absolute -left-6 -bottom-6 w-32 h-32 opacity-60 rotate-12" />
                        <div className="relative">
                            <div className="font-mono text-xs uppercase tracking-[0.25em] text-teal mb-2">Module 01</div>
                            <h2 className="font-heading text-4xl md:text-6xl leading-none uppercase">PS5 FIFA<br/>Knockout</h2>
                            <p className="mt-4 font-body text-ink/80">Register your 4-member team. Battle 1v1. Climb the bracket. ₹100 entry.</p>
                            <div className="mt-6 flex items-center justify-between">
                                <Countdown target={nextPS5Kickoff()} label="Kick-off" />
                                <span className="btn-retro btn-brick !py-2 !px-4 !text-sm">Register →</span>
                            </div>
                        </div>
                    </button>

                    {/* Prediction Card */}
                    <button onClick={onPredictClick} className="text-left retro-card retro-card-hover p-6 md:p-8 relative overflow-hidden bg-mustard" data-testid="predict-card">
                        <div className="absolute -top-4 -right-4 stamp stamp-teal rotate-[8deg]">DAILY · LIVE</div>
                        <div className="absolute inset-0 stripes-bg opacity-[0.06]" />
                        <div className="relative">
                            <div className="font-mono text-xs uppercase tracking-[0.25em] text-teal mb-2">Module 02</div>
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
                            <span className="font-body uppercase tracking-wide">{liveMatch.team_a} vs {liveMatch.team_b}</span>
                            <span className="stamp">{liveMatch.round_label || "Match"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="scoreboard">{liveMatch.score_a} : {liveMatch.score_b}</span>
                            <span className="font-mono text-xs">{liveMatch.station}</span>
                        </div>
                    </div>
                </section>
            )}

            {/* BRACKET / POINTS TOGGLE */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
                <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
                    <h2 className="font-heading text-4xl md:text-5xl uppercase">Tournament <span className="text-brick">{view === "bracket" ? "Bracket" : "Standings"}</span></h2>
                    <div className="inline-flex border-2 border-ink shadow-retro-sm">
                        <button onClick={() => setView("bracket")} data-testid="view-bracket-btn" className={`px-4 py-2 font-heading text-sm uppercase tracking-wider ${view === "bracket" ? "bg-ink text-mustard" : "bg-white"}`}>Bracket</button>
                        <button onClick={() => setView("points")} data-testid="view-points-btn" className={`px-4 py-2 font-heading text-sm uppercase tracking-wider border-l-2 border-ink ${view === "points" ? "bg-ink text-mustard" : "bg-white"}`}>Points Table</button>
                    </div>
                </div>

                {view === "bracket" ? <BracketView matches={matches} /> : <PointsTable points={points} />}
            </section>

            {/* UPCOMING SLOT */}
            {upcoming && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                    <div className="ticket p-6 mx-2 md:mx-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Next Up</div>
                                <div className="font-heading text-2xl md:text-3xl">{upcoming.team_a} <span className="text-brick">vs</span> {upcoming.team_b}</div>
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

function BracketView({ matches }) {
    if (!matches.length) {
        return <div className="ticket p-8 text-center font-body opacity-70" data-testid="bracket-empty">Bracket coming soon. Stay tuned!</div>;
    }
    // Group by round_label
    const order = ["Round of 16", "Quarterfinal", "Semifinal", "Final"];
    const groups = {};
    matches.forEach((m) => {
        const k = m.round_label || "Group";
        groups[k] = groups[k] || [];
        groups[k].push(m);
    });
    const rounds = Object.keys(groups).sort((a, b) => {
        const ai = order.indexOf(a); const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto" data-testid="bracket-grid">
            {rounds.map((r) => (
                <div key={r} className="space-y-4">
                    <h3 className="font-heading text-2xl uppercase border-b-2 border-ink pb-1">{r}</h3>
                    {groups[r].map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
            ))}
        </div>
    );
}

function MatchCard({ m }) {
    const statusColors = { live: "stamp-brick", completed: "stamp-ink", upcoming: "" };
    return (
        <div className={`retro-card retro-card-hover p-4 ${m.status === "live" ? "bg-mustard" : "bg-white"}`} data-testid={`match-card-${m.id}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{m.station}</span>
                <span className={`stamp ${statusColors[m.status]} !text-[10px] !py-0.5 !px-2`}>{m.status === "live" ? <><span className="live-dot" />LIVE</> : m.status}</span>
            </div>
            <Row name={m.team_a} company={m.team_a_company} score={m.score_a} winner={m.winner === m.team_a} done={m.status === "completed"} />
            <div className="text-center my-1 font-mono text-xs opacity-50">vs</div>
            <Row name={m.team_b} company={m.team_b_company} score={m.score_b} winner={m.winner === m.team_b} done={m.status === "completed"} />
            <div className="mt-2 text-[10px] font-mono opacity-60">
                {new Date(m.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </div>
        </div>
    );
}

function Row({ name, company, score, winner, done }) {
    return (
        <div className={`flex items-center justify-between py-1 ${done && !winner && name !== "Draw" ? "opacity-50" : ""}`}>
            <div className="min-w-0">
                <div className="font-heading text-lg leading-none truncate">{name}{winner && <span className="ml-2 text-brick">★</span>}</div>
                <div className="font-mono text-[10px] uppercase opacity-60 truncate">{company}</div>
            </div>
            <span className="font-mono font-bold text-xl tabular-nums">{score}</span>
        </div>
    );
}

function PointsTable({ points }) {
    if (!points.length) return <div className="ticket p-8 text-center opacity-70" data-testid="points-empty">No matches completed yet. Standings will appear here.</div>;
    return (
        <div className="retro-card overflow-x-auto" data-testid="points-table">
            <table className="w-full font-body text-sm">
                <thead className="bg-ink text-mustard">
                    <tr className="text-left">
                        {["#", "Company", "P", "W", "D", "L", "GF", "GA", "GD", "PTS"].map((h) => (
                            <th key={h} className="px-3 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {points.map((r, i) => (
                        <tr key={r.company} className="border-t-2 border-ink/10 hover:bg-mustard/20">
                            <td className="px-3 py-2 font-mono font-bold">{i + 1}</td>
                            <td className="px-3 py-2 font-bold">{r.company}</td>
                            <td className="px-3 py-2 font-mono">{r.played}</td>
                            <td className="px-3 py-2 font-mono">{r.won}</td>
                            <td className="px-3 py-2 font-mono">{r.drawn}</td>
                            <td className="px-3 py-2 font-mono">{r.lost}</td>
                            <td className="px-3 py-2 font-mono">{r.gf}</td>
                            <td className="px-3 py-2 font-mono">{r.ga}</td>
                            <td className="px-3 py-2 font-mono">{r.gd}</td>
                            <td className="px-3 py-2 font-mono font-bold text-brick">{r.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Footer() {
    return (
        <footer className="border-t-2 border-ink bg-ink text-cream py-8 relative z-10" data-testid="site-footer">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                <div className="font-heading text-2xl">TECHNOKICK · 2026</div>
                <div className="font-mono text-xs uppercase tracking-widest opacity-70">Made with ⚽ for the Technopark campus</div>
            </div>
        </footer>
    );
}
