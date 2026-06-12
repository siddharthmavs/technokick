import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import api from "../lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
    const [rows, setRows] = useState(null);

    useEffect(() => {
        api.get("/predictions/leaderboard").then((r) => setRows(r.data)).catch(() => setRows([]));
    }, []);

    const podium = (rows || []).slice(0, 3);
    const rest = (rows || []).slice(3);

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-10">
                    <span className="stamp stamp-brick">Prediction League · Top 10</span>
                    <h1 className="font-heading text-5xl md:text-7xl mt-3 uppercase">Hall of <span className="underline-wiggle">Fame</span></h1>
                    <p className="font-body opacity-70 mt-2">The sharpest football brains on campus. Could be you.</p>
                </div>

                {rows === null ? (
                    <div className="ticket p-8 text-center font-heading text-2xl animate-pulse uppercase">Tallying scores…</div>
                ) : rows.length === 0 ? (
                    <div className="ticket p-8 text-center" data-testid="leaderboard-empty">
                        <div className="font-heading text-3xl uppercase">No scores yet</div>
                        <p className="font-body opacity-70 mt-2">Be the first on the board — submit today's predictions!</p>
                        <Link to="/predict" className="btn-retro btn-brick inline-flex mt-4" data-testid="leaderboard-cta">Predict Now →</Link>
                    </div>
                ) : (
                    <>
                        {/* PODIUM */}
                        <div className="flex items-end justify-center gap-3 md:gap-6 mb-10" data-testid="podium">
                            {[1, 0, 2].map((idx) => {
                                const p = podium[idx];
                                if (!p) return <div key={idx} className="w-28 md:w-44" />;
                                const heights = ["h-44 md:h-56", "h-32 md:h-44", "h-24 md:h-36"];
                                const bgs = ["bg-mustard", "bg-white", "bg-white"];
                                return (
                                    <div key={p.user_id} className="flex flex-col items-center w-28 md:w-44" data-testid={`podium-${idx + 1}`}>
                                        <div className="text-4xl md:text-5xl mb-2">{MEDALS[idx]}</div>
                                        <div className="font-heading text-base md:text-xl uppercase text-center leading-none">{p.name}</div>
                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-2 text-center truncate w-full">{p.company || "—"}</div>
                                        <div className={`w-full ${heights[idx]} ${bgs[idx]} border-2 border-ink shadow-retro-sm flex flex-col items-center justify-center`}>
                                            <span className="font-heading text-3xl md:text-5xl text-brick">{p.points}</span>
                                            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">points</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* TABLE */}
                        {rest.length > 0 && (
                            <div className="retro-card bg-white overflow-x-auto max-w-3xl mx-auto" data-testid="leaderboard-table">
                                <table className="w-full font-body text-sm">
                                    <thead className="bg-ink text-mustard">
                                        <tr className="text-left">
                                            {["#", "Player", "Company", "Predictions", "PTS"].map((h) => (
                                                <th key={h} className="px-4 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rest.map((r, i) => (
                                            <tr key={r.user_id} className="border-t-2 border-ink/10 hover:bg-mustard/20">
                                                <td className="px-4 py-2 font-mono font-bold">{i + 4}</td>
                                                <td className="px-4 py-2 font-bold">{r.name}</td>
                                                <td className="px-4 py-2 font-mono text-xs uppercase opacity-70">{r.company || "—"}</td>
                                                <td className="px-4 py-2 font-mono">{r.submissions}</td>
                                                <td className="px-4 py-2 font-mono font-bold text-brick">{r.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
}
