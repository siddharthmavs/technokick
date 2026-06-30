import React, { useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

let scriptPromise = null;
function loadRecaptchaScript() {
    if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                window.grecaptcha.ready(() => resolve(window.grecaptcha));
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    return scriptPromise;
}

/** Google reCAPTCHA v2 checkbox widget. Calls onChange(token|null) when solved/expired. */
export default function Recaptcha({ onChange }) {
    const containerRef = useRef(null);
    const widgetId = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!SITE_KEY) return;
        let cancelled = false;
        loadRecaptchaScript().then((grecaptcha) => {
            if (cancelled || !containerRef.current || widgetId.current !== null) return;
            widgetId.current = grecaptcha.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: (token) => onChange(token),
                "expired-callback": () => onChange(null),
                "error-callback": () => onChange(null),
            });
            setReady(true);
        }).catch(() => setReady(false));
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!SITE_KEY) {
        return (
            <div className="font-mono text-[10px] uppercase tracking-widest text-brick" data-testid="recaptcha-missing-key">
                ⚠ REACT_APP_RECAPTCHA_SITE_KEY not configured
            </div>
        );
    }

    return <div ref={containerRef} data-testid="recaptcha-widget" className={ready ? "" : "opacity-50"} />;
}
