import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import PushPrompt from "../components/PushPrompt";
import { Footer } from "./Home";
import { MatchCard } from "../components/PS5";
import api from "../lib/api";
import { useAuth } from "../lib/auth";

function fmtAnswer(a) {
    if (a === null || a === undefined) return "—";
    if (Array.isArray(a)) return a.join(", ");
    if (typeof a === "object") return `${a.a ?? "?"} - ${a.b ?? "?"}`;
    return String(a);
}

export default function Dashboard() {
    const { user } = useAuth();
    const [hist, setHist] = useState(null);
    const [reg, setReg] = useState(null);
    const [myMatches, setMyMatches] = useState([]);

    useEffect(() => {
        api.get("/predictions/history").then((r) => setHist(r.data)).catch(() => {});
        api.get("/ps5/registrations/mine").then((r) => setReg(r.data)).catch(() => {});
        api.get("/ps5/matches/mine").then((r) => setMyMatches(r.data)).catch(() => {});
    }, []);

    const subs = hist?.submissions || [];

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <PushPrompt />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="stamp stamp-brick">Player Dashboard</span>
                </div>
                <h1 className="font-heading text-5xl md:text-6xl uppercase leading-none" data-testid="dashboard-greeting">
                    Hey, <span className="text-brick">{user?.name?.split(" ")[0] || "Player"}!</span>
                </h1>
                <p className="font-body opacity-70 mt-2">Your campaign at a glance. Keep predicting, keep climbing.</p>

                {/* STAT CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <StatCard label="Prediction Points" value={hist ? hist.total_points : "…"} accent="text-brick" testId="stat-points" />
                    <StatCard label="Predictions Made" value={hist ? subs.length : "…"} accent="text-teal" testId="stat-predictions" />
                    <StatCard label="My Group" value={reg ? (reg.group ? `Group ${reg.group}` : "Awaiting draw") : "Not entered"} accent="text-ink" testId="stat-group" small={!reg?.group} />
                    <StatCard label="PS5 Entry" value={reg ? (reg.payment_status === "confirmed" ? "PAID ✓" : "₹100 DUE") : "—"} accent={reg?.payment_status === "confirmed" ? "text-teal" : "text-brick"} testId="stat-payment" small />
                </div>

                {/* PS5 SECTION */}
                <section className="mt-12">
                    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
                        <h2 className="font-heading text-3xl md:text-4xl uppercase">My PS5 <span className="text-brick">Matches</span></h2>
                        {!reg && <Link to="/ps5/terms" className="btn-retro btn-brick !text-xs !py-2 !px-3" data-testid="dash-register-cta">Join the Tournament →</Link>}
                        {reg && <Link to="/ps5/register" className="font-mono text-xs uppercase tracking-widest underline opacity-70 hover:opacity-100" data-testid="dash-view-ticket">View my ticket →</Link>}
                    </div>
                    {myMatches.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="my-matches-grid">
                            {myMatches.map((m) => <MatchCard key={m.id} m={m} />)}
                        </div>
                    ) : (
                        <div className="ticket p-6 text-center font-body opacity-70" data-testid="my-matches-empty">
                            {reg ? "No matches scheduled for you yet. The committee will fixture your group soon!" : "You haven't entered the PS5 FIFA World Cup yet. Register solo and get drawn into a group!"}
                        </div>
                    )}
                </section>

                {/* PREDICTION HISTORY */}
                <section className="mt-12">
                    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
                        <h2 className="font-heading text-3xl md:text-4xl uppercase">Prediction <span className="text-teal">History</span></h2>
                        <Link to="/predict" className="btn-retro btn-ink !text-xs !py-2 !px-3" data-testid="dash-predict-cta">Today's Questions →</Link>
                    </div>
                    {subs.length ? (
                        <div className="retro-card bg-white overflow-x-auto" data-testid="history-table">
                            <table className="w-full font-body text-sm">
                                <thead className="bg-ink text-mustard">
                                    <tr className="text-left">
                                        {["Date", "Question", "Your Answer", "Status", "PTS"].map((h) => (
                                            <th key={h} className="px-3 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.map((s) => {
                                        const q = hist.questions[s.question_id];
                                        return (
                                            <tr key={s.id || s.question_id} className="border-t-2 border-ink/10">
                                                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{s.date}</td>
                                                <td className="px-3 py-2">{q?.text || "—"}</td>
                                                <td className="px-3 py-2 font-bold">{fmtAnswer(s.answer)}</td>
                                                <td className="px-3 py-2">
                                                    {q?.results_entered ? (
                                                        <span className={`stamp !text-[10px] !py-0.5 !px-2 ${s.points_earned > 0 ? "stamp-teal" : "stamp-brick"}`}>{s.points_earned > 0 ? "CORRECT" : "MISSED"}</span>
                                                    ) : (
                                                        <span className="stamp !text-[10px] !py-0.5 !px-2">PENDING</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-mono font-bold text-brick">{q?.results_entered ? s.points_earned : "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="ticket p-6 text-center font-body opacity-70" data-testid="history-empty">
                            No predictions yet. Today's questions are waiting — go call the shots!
                        </div>
                    )}
                </section>
            </div>
            <Footer />
        </div>
    );
}

function StatCard({ label, value, accent, testId, small }) {
    return (
        <div className="retro-card bg-white p-4 md:p-5" data-testid={testId}>
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">{label}</div>
            <div className={`font-heading ${small ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"} mt-1 ${accent}`}>{value}</div>
        </div>
    );
}
