import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import Countdown from "../components/Countdown";
import Confetti from "../components/Confetti";
import { nextLeaderboardReveal, todayIstDateStr } from "../lib/time";
import api from "../lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];
const PAGE_SIZE = 20;

function fmtDate(d) {
    return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Format ISO timestamp as UTC time string e.g. "10:34 AM"
function fmtSubmitTime(iso) {
    if (!iso) return "—";
    const utcTime = new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC"
    });
    return `${utcTime} UTC`;
}

export default function Leaderboard() {
    const [selectedDate, setSelectedDate] = useState(null); // null = today/latest
    const [availableDates, setAvailableDates] = useState([]);
    const [status, setStatus] = useState(null);
    const [rows, setRows] = useState(null);
    const [fullPage, setFullPage] = useState(1);
    const [fullData, setFullData] = useState(null);
    const [fullLoading, setFullLoading] = useState(false);

    useEffect(() => {
        api.get("/predictions/leaderboard/dates").then((r) => setAvailableDates(r.data)).catch(() => setAvailableDates([]));
    }, []);

    useEffect(() => {
        setStatus(null);
        const q = selectedDate ? `?date=${selectedDate}` : "";
        api.get(`/predictions/leaderboard/status${q}`).then((r) => setStatus(r.data)).catch(() => setStatus({ published: false }));
    }, [selectedDate]);

    useEffect(() => {
        if (!status?.published) return;
        const q = selectedDate ? `?date=${selectedDate}` : "";
        api.get(`/predictions/leaderboard${q}`).then((r) => setRows(r.data)).catch(() => setRows([]));
    }, [status, selectedDate]);

    useEffect(() => {
        if (!status?.published) return;
        setFullLoading(true);
        const dateParam = selectedDate ? `date=${selectedDate}&` : "";
        api.get(`/predictions/leaderboard/full?${dateParam}page=${fullPage}&page_size=${PAGE_SIZE}`)
            .then((r) => setFullData(r.data))
            .catch(() => setFullData({ total: 0, page: 1, page_size: PAGE_SIZE, rows: [] }))
            .finally(() => setFullLoading(false));
    }, [status, selectedDate, fullPage]);

    const onDateChange = (e) => {
        setRows(null);
        setFullData(null);
        setFullPage(1);
        setSelectedDate(e.target.value || null);
    };

    const podium = (rows || []).slice(0, 3);
    const rest = (rows || []).slice(3);
    const totalPages = fullData ? Math.max(1, Math.ceil(fullData.total / PAGE_SIZE)) : 1;
    const todayStr = todayIstDateStr();

    return (
        <div className="App min-h-screen bg-cream">
            {status?.published && rows !== null && rows.length > 0 && <Confetti />}
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-10">
                    <span className="stamp stamp-brick">Prediction League · Top 10</span>
                    <h1 className="font-heading text-5xl md:text-7xl mt-3 uppercase">Hall of <span className="underline-wiggle">Fame</span></h1>
                    <p className="font-body opacity-70 mt-2">The sharpest football brains on campus. Could be you.</p>
                    <p className="font-body text-sm font-bold text-brick mt-2" data-testid="leaderboard-prize-banner">🏆 The Number 1 spot wins exciting cash prizes worth ₹500!</p>
                    {status?.published && (
                        <p className="font-mono text-[11px] uppercase tracking-widest opacity-60 mt-2">Ties broken by earliest submission time ⏱</p>
                    )}
                </div>

                {availableDates.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap" data-testid="leaderboard-date-picker">
                        <label htmlFor="leaderboard-date-select" className="font-mono text-xs uppercase tracking-widest opacity-70">Viewing rankings as of</label>
                        <select id="leaderboard-date-select" value={selectedDate || ""} onChange={onDateChange} className="input-retro !w-56 !py-2" data-testid="leaderboard-date-select">
                            <option value="">Today · {fmtDate(todayStr)}</option>
                            {availableDates.filter((d) => d.date !== todayStr).map((d) => (
                                <option key={d.date} value={d.date}>{fmtDate(d.date)}</option>
                            ))}
                        </select>
                    </div>
                )}

                {status === null ? (
                    <div className="ticket p-8 text-center font-heading text-2xl animate-pulse uppercase">Checking results…</div>
                ) : !status.published ? (
                    <div className="ticket p-10 text-center max-w-xl mx-auto" data-testid="leaderboard-not-published">
                        <span className="text-5xl">⏳</span>
                        <div className="font-heading text-3xl md:text-4xl uppercase mt-4">Results Coming Soon</div>
                        <p className="font-body opacity-70 mt-2">The committee is tallying today's predictions. The leaderboard unlocks once results are published — by 9:30 AM tomorrow at the latest.</p>
                        <div className="mt-6 flex justify-center">
                            <Countdown target={nextLeaderboardReveal()} label="Reveal in" />
                        </div>
                        <Link to="/predict" className="btn-retro btn-brick inline-flex mt-6" data-testid="leaderboard-cta">Predict Now →</Link>
                    </div>
                ) : rows === null ? (
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
                                const isTied = idx > 0 && podium[idx - 1] && podium[idx - 1].points === p.points;
                                return (
                                    <div key={p.user_id} className="flex flex-col items-center w-28 md:w-44" data-testid={`podium-${idx + 1}`}>
                                        <div className="text-4xl md:text-5xl mb-2">{MEDALS[idx]}</div>
                                        <div className="font-heading text-base md:text-xl uppercase text-center leading-none">{p.name}</div>
                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-2 text-center truncate w-full">{p.company || "—"}</div>
                                        <div className={`w-full ${heights[idx]} ${bgs[idx]} border-2 border-ink shadow-retro-sm flex flex-col items-center justify-center gap-0.5`}>
                                            <span className="font-heading text-3xl md:text-5xl text-brick">{p.points}</span>
                                            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">points</span>
                                            <span className="font-mono text-[9px] opacity-50">⏰ {fmtSubmitTime(p.first_submitted)}</span>
                                            {isTied && <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">⏱ tiebreak</span>}
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
                                            {["#", "Player", "Company", "Predictions", "Submitted", "PTS"].map((h) => (
                                                <th key={h} className="px-4 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rest.map((r, i) => {
                                            const allRows = rows || [];
                                            const prev = allRows[i + 3 - 1];
                                            const isTied = prev && prev.points === r.points;
                                            return (
                                                <tr key={r.user_id} className="border-t-2 border-ink/10 hover:bg-mustard/20">
                                                    <td className="px-4 py-2 font-mono font-bold">{i + 4}</td>
                                                    <td className="px-4 py-2 font-bold">{r.name}</td>
                                                    <td className="px-4 py-2 font-mono text-xs uppercase opacity-70">{r.company || "—"}</td>
                                                    <td className="px-4 py-2 font-mono">{r.submissions}</td>
                                                    <td className="px-4 py-2 font-mono text-xs opacity-60">⏰ {fmtSubmitTime(r.first_submitted)}</td>
                                                    <td className="px-4 py-2 font-mono font-bold text-brick">
                                                        {r.points}{isTied && <span className="ml-1 text-[10px] opacity-50">⏱</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* FULL RANKINGS — PAGINATED */}
                {status?.published && rows !== null && rows.length > 0 && (
                    <section className="mt-16" data-testid="full-rankings-section">
                        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
                            <h2 className="font-heading text-3xl md:text-4xl uppercase">Full <span className="text-brick">Rankings</span></h2>
                            {fullData && <span className="font-mono text-xs uppercase tracking-widest opacity-60">{fullData.total} players total</span>}
                        </div>

                        <div className="retro-card bg-white overflow-x-auto max-w-3xl mx-auto" data-testid="full-rankings-table">
                            <table className="w-full font-body text-sm">
                                <thead className="bg-ink text-mustard">
                                    <tr className="text-left">
                                        {["Rank", "Player", "Company", "Predictions", "Submitted", "PTS"].map((h) => (
                                            <th key={h} className="px-4 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fullLoading ? (
                                        <tr><td colSpan="6" className="px-4 py-8 text-center opacity-60 font-heading uppercase animate-pulse">Loading…</td></tr>
                                    ) : fullData?.rows.length ? (
                                        fullData.rows.map((r) => (
                                            <tr key={r.user_id} className="border-t-2 border-ink/10 hover:bg-mustard/20" data-testid={`full-rank-row-${r.rank}`}>
                                                <td className="px-4 py-2 font-mono font-bold">#{r.rank}</td>
                                                <td className="px-4 py-2 font-bold">{r.name}</td>
                                                <td className="px-4 py-2 font-mono text-xs uppercase opacity-70">{r.company || "—"}</td>
                                                <td className="px-4 py-2 font-mono">{r.submissions}</td>
                                                <td className="px-4 py-2 font-mono text-xs opacity-60">⏰ {fmtSubmitTime(r.first_submitted)}</td>
                                                <td className="px-4 py-2 font-mono font-bold text-brick">{r.points}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="px-4 py-8 text-center opacity-60">No players on this page.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-5" data-testid="full-rankings-pagination">
                                <button onClick={() => setFullPage((p) => Math.max(1, p - 1))} disabled={fullPage <= 1 || fullLoading} className="btn-retro !text-xs !py-2 !px-3 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="pagination-prev-btn">
                                    ← Prev
                                </button>
                                <span className="font-mono text-xs uppercase tracking-widest opacity-70" data-testid="pagination-status">
                                    Page {fullPage} of {totalPages}
                                </span>
                                <button onClick={() => setFullPage((p) => Math.min(totalPages, p + 1))} disabled={fullPage >= totalPages || fullLoading} className="btn-retro !text-xs !py-2 !px-3 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="pagination-next-btn">
                                    Next →
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>
            <Footer />
        </div>
    );
}
