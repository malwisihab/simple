import { getStore } from "@netlify/blobs";
import webpush from "web-push";

const subscriptions = getStore("simplecom-push-subscriptions");

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

export async function saveSubscription(room, role, subscription) {
  await subscriptions.setJSON(`${room}/${role}`, subscription);
}

export async function pushToPartner(room, sender, payload) {
  const partner = sender === "cowo" ? "cewe" : "cowo";
  const key = `${room}/${partner}`;
  const subscription = await subscriptions.get(key, { type: "json" });

  if (!subscription) return { sent: false, reason: "partner_not_subscribed" };

  configurePush();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60,
      urgency: "high"
    });
    return { sent: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await subscriptions.delete(key);
      return { sent: false, reason: "subscription_expired" };
    }
    console.error("Web Push error:", err);
    throw err;
  }
}
