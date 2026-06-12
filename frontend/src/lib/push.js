import api from "./api";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export function pushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getExistingSubscription() {
    if (!pushSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return null;
    return reg.pushManager.getSubscription();
}

export async function enablePush() {
    if (!pushSupported()) throw new Error("Push notifications aren't supported in this browser.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        const { data } = await api.get("/push/vapid-public-key");
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
    }
    await api.post("/push/subscribe", sub.toJSON());
    return sub;
}

export async function disablePush() {
    const sub = await getExistingSubscription();
    if (sub) {
        await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
    }
}
