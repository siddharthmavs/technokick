import React, { useEffect, useState } from "react";

/** Countdown to a target Date. Returns scoreboard-styled string */
export function useCountdown(targetDate) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const i = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(i);
    }, []);
    const diff = Math.max(0, targetDate.getTime() - now.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return { days, hours, minutes, seconds, pad, expired: diff === 0, raw: diff };
}

/** Return next 7PM IST today or tomorrow */
export function nextPS5Kickoff() {
    // 7 PM IST = 13:30 UTC
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 13, 30, 0));
    if (now.getTime() > target.getTime()) target.setUTCDate(target.getUTCDate() + 1);
    return target;
}

/** Return today's 10AM IST open (4:30 UTC) — next occurrence if already past */
export function predictionWindowOpen() {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 30, 0));
    if (now.getTime() > target.getTime()) target.setUTCDate(target.getUTCDate() + 1);
    return target;
}

/** Return today's 8PM IST close (14:30 UTC) — next occurrence if already past */
export function predictionWindowClose() {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 14, 30, 0));
    if (now.getTime() > target.getTime()) target.setUTCDate(target.getUTCDate() + 1);
    return target;
}

export function isPredictionWindowOpen() {
    const now = new Date();
    const h = now.getUTCHours() + now.getUTCMinutes() / 60;
    return h >= 4.5 && h <= 14.5; // 10AM to 8PM IST in UTC
}

/** Today's calendar date in IST as YYYY-MM-DD */
export function todayIstDateStr() {
    return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Next 9:30AM IST (4:00 UTC) — the leaderboard reveal deadline */
export function nextLeaderboardReveal() {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
    if (now.getTime() > target.getTime()) target.setUTCDate(target.getUTCDate() + 1);
    return target;
}

// July 5 2026, 23:59 IST = 18:29 UTC
export const PS5_REG_DEADLINE = new Date(Date.UTC(2026, 6, 5, 18, 30, 0));

export function isPS5RegOpen() {
    return new Date() < PS5_REG_DEADLINE;
}
