import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Header from "../components/Header";
import Countdown from "../components/Countdown";
import { Footer } from "./Home";
import api, { formatApiError } from "../lib/api";
import { predictionWindowOpen, predictionWindowClose, isPredictionWindowOpen } from "../lib/time";

export default function Predict() {
    const [data, setData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [saving, setSaving] = useState(false);
    const windowOpen = isPredictionWindowOpen();

    const load = () => {
        api.get("/predictions/today").then((r) => {
            setData(r.data);
            const init = {};
            Object.values(r.data.submissions || {}).forEach((s) => { init[s.question_id] = s.answer; });
            setAnswers(init);
        }).catch(() => {});
    };
    useEffect(load, []);

    const setAns = (qid, val) => setAnswers((a) => ({ ...a, [qid]: val }));

    const submit = async () => {
        const payload = Object.entries(answers)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([question_id, answer]) => ({ question_id, answer }));
        if (!payload.length) { toast.error("Pick at least one answer first!"); return; }
        setSaving(true);
        try {
            await api.post("/predictions/submit", { answers: payload });
            toast.success("Predictions locked in! 🔮 Come back after the matches for your score.");
            load();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    const fixtures = {};
    (data?.fixtures || []).forEach((f) => { fixtures[f.id] = f; });
    const alreadySubmitted = Object.keys(data?.submissions || {}).length > 0;

    const submitLabel = () => {
        if (saving) return "Locking in…";
        if (alreadySubmitted) return "Already Submitted ✓";
        if (!windowOpen) return "Window Closed — Back at 10AM IST";
        return "Lock In My Predictions →";
    };

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <span className="stamp stamp-teal">Daily Predictions · {data?.date || ""}</span>
                        <h1 className="font-heading text-5xl md:text-6xl mt-3 uppercase">Call <span className="text-brick">The Shots</span></h1>
                        <p className="font-body text-sm font-bold text-brick mt-2" data-testid="prize-banner">🏆 Top of the leaderboard wins exciting cash prizes worth ₹500!</p>
                        <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                            <Countdown target={windowOpen ? predictionWindowClose() : predictionWindowOpen()} label={windowOpen ? "Window closes in" : "Window opens in"} />
                            <span className={`stamp ${windowOpen ? "stamp-teal" : "stamp-brick"}`} data-testid="window-status">{windowOpen ? "OPEN" : "CLOSED"}</span>
                        </div>
                    </div>

                    {!data ? (
                        <div className="ticket p-8 text-center font-heading text-2xl animate-pulse uppercase">Loading today's questions…</div>
                    ) : data.questions.length === 0 ? (
                        <div className="ticket p-8 text-center" data-testid="no-questions">
                            <div className="font-heading text-3xl uppercase">No questions yet today</div>
                            <p className="font-body opacity-70 mt-2">The committee is cooking up today's predictions. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {data.questions.map((q, i) => (
                                <QuestionCard key={q.id} q={q} index={i} fixture={fixtures[q.fixture_id]} value={answers[q.id]} onChange={(v) => setAns(q.id, v)} submission={data.submissions?.[q.id]} locked={alreadySubmitted} />
                            ))}
                            <button onClick={submit} disabled={saving || !windowOpen || alreadySubmitted} className="btn-retro btn-brick w-full disabled:opacity-40 disabled:cursor-not-allowed" data-testid="predictions-submit-btn">
                                {submitLabel()}
                            </button>
                            {!alreadySubmitted && windowOpen && (
                                <p className="font-mono text-[10px] uppercase tracking-widest text-center opacity-60">Your answers are final once you submit.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

function FixtureBanner({ f }) {
    if (!f) return null;
    return (
        <div className="flex items-center justify-between bg-ink text-cream px-4 py-2 -mx-5 -mt-5 mb-4 border-b-2 border-ink">
            <span className="font-heading text-lg md:text-xl uppercase">{f.team_a_flag} {f.team_a} <span className="text-mustard">vs</span> {f.team_b} {f.team_b_flag}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-70 hidden sm:block">{f.stage} · {f.venue}</span>
        </div>
    );
}

function QuestionCard({ q, index, fixture, value, onChange, submission, locked }) {
    const scored = q.results_entered;
    return (
        <div className="retro-card bg-white p-5" data-testid={`question-card-${index}`}>
            <FixtureBanner f={fixture} />
            <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-heading text-xl md:text-2xl uppercase leading-tight">
                    <span className="text-brick">Q{index + 1}.</span> {q.text}
                </h3>
                <span className="stamp !text-[10px] whitespace-nowrap">{q.points} PTS</span>
            </div>

            {scored ? (
                <ScoredResult q={q} submission={submission} />
            ) : (
                <AnswerInput q={q} value={value} onChange={onChange} index={index} locked={locked} />
            )}
        </div>
    );
}

function AnswerInput({ q, value, onChange, index, locked }) {
    if (q.type === "numeric_score") {
        const v = value || {};
        const onChangeA = (e) => {
            if (locked) return;
            const a = e.target.value === "" ? "" : Number(e.target.value);
            // auto-default b to 0 when first touching a
            const b = v.b !== "" && v.b !== undefined ? v.b : 0;
            onChange({ ...v, a, b });
        };
        const onChangeB = (e) => {
            if (locked) return;
            const b = e.target.value === "" ? "" : Number(e.target.value);
            // auto-default a to 0 when first touching b
            const a = v.a !== "" && v.a !== undefined ? v.a : 0;
            onChange({ ...v, a, b });
        };
        return (
            <div className="flex items-center gap-3" data-testid={`answer-numeric-${index}`}>
                <input type="number" min="0" max="20" value={v.a ?? ""} onChange={onChangeA} readOnly={locked} className={`input-retro !w-20 text-center font-mono text-xl ${locked ? "opacity-60 cursor-not-allowed" : ""}`} placeholder="0" data-testid={`score-a-input-${index}`} />
                <span className="font-heading text-2xl">—</span>
                <input type="number" min="0" max="20" value={v.b ?? ""} onChange={onChangeB} readOnly={locked} className={`input-retro !w-20 text-center font-mono text-xl ${locked ? "opacity-60 cursor-not-allowed" : ""}`} placeholder="0" data-testid={`score-b-input-${index}`} />
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Exact score = bonus points!</span>
            </div>
        );
    }
    if (q.type === "multi_select") {
        const sel = Array.isArray(value) ? value : [];
        const toggle = (opt) => !locked && onChange(sel.includes(opt) ? sel.filter((o) => o !== opt) : [...sel, opt]);
        return (
            <div className="flex flex-wrap gap-2" data-testid={`answer-multi-${index}`}>
                {q.options.map((opt) => (
                    <button key={opt} type="button" onClick={() => toggle(opt)} disabled={locked} className={`px-3 py-2 border-2 border-ink font-body font-bold text-sm transition-colors ${sel.includes(opt) ? "bg-teal text-white shadow-retro-sm" : "bg-white"} ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-mustard/40"}`} data-testid={`option-${index}-${opt.replace(/\s/g, "-")}`}>
                        {sel.includes(opt) ? "✓ " : ""}{opt}
                    </button>
                ))}
            </div>
        );
    }
    if (q.type === "text") {
        return (
            <input
                type="text"
                value={value || ""}
                onChange={(e) => !locked && onChange(e.target.value)}
                readOnly={locked}
                maxLength={60}
                className={`input-retro ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                placeholder="Type your answer…"
                data-testid={`answer-text-${index}`}
            />
        );
    }
    // dropdown / radio
    return (
        <div className="flex flex-wrap gap-2" data-testid={`answer-choice-${index}`}>
            {q.options.map((opt) => (
                <button key={opt} type="button" onClick={() => !locked && onChange(opt)} disabled={locked} className={`px-4 py-2 border-2 border-ink font-body font-bold text-sm transition-colors ${value === opt ? "bg-ink text-mustard shadow-retro-sm" : "bg-white"} ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-mustard/40"}`} data-testid={`option-${index}-${opt.replace(/\s/g, "-")}`}>
                    {opt}
                </button>
            ))}
        </div>
    );
}

function fmtAnswer(a) {
    if (a === null || a === undefined) return "—";
    if (Array.isArray(a)) return a.join(", ");
    if (typeof a === "object") return `${a.a ?? "?"} - ${a.b ?? "?"}`;
    return String(a);
}

function ScoredResult({ q, submission }) {
    return (
        <div className="bg-cream border-2 border-ink p-4 space-y-2" data-testid="scored-result">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Results are in!</span>
                {submission ? (
                    <span className={`stamp ${submission.points_earned > 0 ? "stamp-teal" : "stamp-brick"}`}>{submission.points_earned > 0 ? `+${submission.points_earned} PTS` : "0 PTS"}</span>
                ) : (
                    <span className="stamp">DIDN'T PLAY</span>
                )}
            </div>
            <div className="font-body text-sm"><strong>Correct answer:</strong> {fmtAnswer(q.correct_answer)}</div>
            {submission && <div className="font-body text-sm"><strong>Your answer:</strong> {fmtAnswer(submission.answer)}</div>}
        </div>
    );
}
