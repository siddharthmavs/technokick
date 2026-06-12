import React from "react";
import { useCountdown } from "../lib/time";

export default function Countdown({ target, label = "Kicks off in" }) {
    const c = useCountdown(target);
    return (
        <div className="inline-flex items-center gap-2" data-testid="countdown">
            <span className="font-body text-[10px] uppercase tracking-widest font-bold opacity-70">{label}</span>
            <div className="scoreboard text-sm md:text-base">
                {c.days > 0 && <>{c.pad(c.days)}<span className="opacity-40">D </span></>}
                {c.pad(c.hours)}<span className="opacity-40">:</span>{c.pad(c.minutes)}<span className="opacity-40">:</span>{c.pad(c.seconds)}
            </div>
        </div>
    );
}
