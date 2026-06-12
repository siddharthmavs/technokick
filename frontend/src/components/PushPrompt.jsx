import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { pushSupported, getExistingSubscription, enablePush } from "../lib/push";

const DISMISS_KEY = "tk_push_dismissed";

export default function PushPrompt() {
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!pushSupported()) return;
        if (Notification.permission === "denied") return;
        if (localStorage.getItem(DISMISS_KEY)) return;
        getExistingSubscription().then((sub) => {
            if (!sub) setShow(true);
        }).catch(() => setShow(true));
    }, []);

    const enable = async () => {
        setBusy(true);
        try {
            await enablePush();
            toast.success("🔔 You're in! You'll get a ping whenever the committee announces anything.");
            setShow(false);
        } catch (e) {
            toast.error(e.message || "Couldn't enable notifications.");
        } finally {
            setBusy(false);
        }
    };

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, "1");
        setShow(false);
    };

    if (!show) return null;
    return (
        <div className="border-b-2 border-ink bg-teal text-white" data-testid="push-prompt-banner">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <div className="font-heading uppercase tracking-wide text-lg leading-none">Never miss a kickoff!</div>
                        <div className="font-body text-xs opacity-90">Enable notifications — draws, results & committee announcements, straight to your screen.</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={enable} disabled={busy} className="btn-retro btn-brick !text-xs !py-2 !px-4" data-testid="push-enable-btn">
                        {busy ? "Enabling…" : "🔔 Turn On Alerts"}
                    </button>
                    <button onClick={dismiss} className="font-mono text-xs uppercase tracking-widest underline opacity-80 hover:opacity-100" data-testid="push-dismiss-btn">
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
