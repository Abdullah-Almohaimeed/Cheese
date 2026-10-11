"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushSubscription, saveReminderLead, savePushSubscription, sendTestReminder } from "@/app/actions/reminders";

type Phase = "checking" | "unsupported" | "not-installed" | "denied" | "off" | "on";

function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function ReminderSettings({ vapidKey, lead }: { vapidKey: string | null; lead: number }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [minutes, setMinutes] = useState(lead);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone only allows notifications from a web app that has been added to the Home Screen.
        return setPhase(isIos() && !isStandalone() ? "not-installed" : "unsupported");
      }
      if (Notification.permission === "denied") return setPhase("denied");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setPhase(sub ? "on" : "off");
    })().catch(() => setPhase("unsupported"));
  }, []);

  async function enable() {
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setPhase(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey as string) }));
      const json = sub.toJSON();
      const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      if (!res.ok) return setNote(res.error ?? "Could not turn reminders on.");
      setPhase("on");
    } catch {
      setNote("Could not turn reminders on for this device.");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setPhase("off");
  }

  return (
    <div className="stack">
      <div className="field">
        <span className="lbl" id="lead-label">Remind me</span>
        <div className="ch-seg" role="group" aria-labelledby="lead-label">
          {[0, 15, 30, 60].map((m) => (
            <button
              key={m}
              aria-pressed={minutes === m}
              onClick={() => {
                setMinutes(m);
                start(async () => {
                  const r = await saveReminderLead(m);
                  if (!r.ok) setNote(r.error ?? "Could not save.");
                });
              }}
            >
              {m === 0 ? "Off" : `${m} min`}
            </button>
          ))}
        </div>
        <p className="hint">{minutes === 0 ? "No reminders." : `A notification ${minutes} minutes before each session.`}</p>
      </div>

      {!vapidKey ? (
        <p className="hint">Reminders are not set up on this server yet. See SETUP.md.</p>
      ) : phase === "checking" ? null : phase === "unsupported" ? (
        <p className="hint">This browser cannot show reminders. Try Chrome or Safari on your phone.</p>
      ) : phase === "not-installed" ? (
        <p className="hint">On iPhone, reminders work once Cheese is on your Home Screen. Tap Share, then Add to Home Screen, and open Cheese from there.</p>
      ) : phase === "denied" ? (
        <p className="hint">Notifications are blocked for Cheese on this device. Allow them in your browser or phone settings, then come back.</p>
      ) : phase === "on" ? (
        <div className="stack">
          <p className="hint">Reminders are on for this device.</p>
          <div className="row">
            <button
              className="ch-btn ch-btn--ghost grow"
              disabled={pending}
              onClick={() => start(async () => setNote((await sendTestReminder()).message))}
            >
              Send a test
            </button>
            <button className="ch-btn ch-btn--ghost" onClick={disable}>Turn off</button>
          </div>
        </div>
      ) : (
        <button className="ch-btn ch-btn--primary ch-btn--block" onClick={enable}>
          Turn on reminders
        </button>
      )}
      {note && <p className="hint" role="status">{note}</p>}
    </div>
  );
}
