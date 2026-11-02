import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import webpush from "web-push";

const subscriptions = getStore("simplecom-push-subscriptions");
const stateStore = getStore({ name: "simplecom-state", consistency: "strong" });

const MAX_ACTIONS_PER_MINUTE = 20;
const MAX_SEEN_EVENTS = 50;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function readBody(req) {
  try { return await req.json(); } catch { return null; }
}

export function validRoom(room) {
  return typeof room === "string" && /^[a-z0-9_-]{4,40}$/i.test(room);
}

export function validRole(role) {
  return role === "cowo" || role === "cewe";
}

export function resolveEventId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(id) ? id : randomUUID();
}

export function todayWIB() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID environment variables are missing");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return publicKey;
}

function emptyState(date) {
  return { date, kangen: { cowo: 0, cewe: 0 }, battery: {}, mood: {}, seen: [], recent: [] };
}

export async function loadState(room) {
  const today = todayWIB();
  const state = await stateStore.get(`state/${room}`, { type: "json" });
  if (!state || typeof state !== "object") return emptyState(today);

  state.kangen = state.kangen || { cowo: 0, cewe: 0 };
  state.battery = state.battery || {};
  state.mood = state.mood || {};
  state.seen = Array.isArray(state.seen) ? state.seen : [];
  state.recent = Array.isArray(state.recent) ? state.recent : [];

  if (state.date !== today) {
    state.date = today;
    state.kangen = { cowo: 0, cewe: 0 };
  }
  return state;
}

export async function saveState(room, state) {
  await stateStore.setJSON(`state/${room}`, state);
}

export function guard(state, eventId) {
  if (state.seen.includes(eventId)) return "duplicate";

  const now = Date.now();
  state.recent = state.recent.filter((t) => now - t < 60000);
  if (state.recent.length >= MAX_ACTIONS_PER_MINUTE) return "rate_limited";

  state.recent.push(now);
  state.seen.push(eventId);
  if (state.seen.length > MAX_SEEN_EVENTS) state.seen = state.seen.slice(-MAX_SEEN_EVENTS);
  return null;
}

export async function saveSubscription(room, role, subscription) {
  const other = role === "cowo" ? "cewe" : "cowo";
  const otherKey = `${room}/${other}`;
  const otherSub = await subscriptions.get(otherKey, { type: "json" });
  if (otherSub && otherSub.endpoint === subscription.endpoint) {
    await subscriptions.delete(otherKey);
  }
  await subscriptions.setJSON(`${room}/${role}`, subscription);
}

export async function pushToPartner(room, sender, payload, options = {}) {
  const partner = sender === "cowo" ? "cewe" : "cowo";
  const key = `${room}/${partner}`;
  const subscription = await subscriptions.get(key, { type: "json" });

  if (!subscription) return { sent: false, reason: "partner_not_subscribed" };

  const own = await subscriptions.get(`${room}/${sender}`, { type: "json" });
  if (own && own.endpoint && own.endpoint === subscription.endpoint) {
    return { sent: false, reason: "same_device" };
  }

  configurePush();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: options.ttl || 300,
      urgency: "high"
    });
    return { sent: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await subscriptions.delete(key);
      return { sent: false, reason: "subscription_expired" };
    }
    console.error("Web Push error:", err);
    return { sent: false, reason: "push_failed" };
  }
}
