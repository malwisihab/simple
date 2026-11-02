import { json, readBody, validRoom, validRole, saveSubscription } from "./_shared.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, role, subscription } = body || {};

  if (!validRoom(room) || !validRole(role) ||
      typeof subscription?.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return json({ error: "Data subscription tidak valid" }, 400);
  }

  // Simpan hanya field yang dibutuhkan
  const clean = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
  };

  try {
    await saveSubscription(room.toLowerCase(), role, clean);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal menyimpan subscription" }, 500);
  }
};