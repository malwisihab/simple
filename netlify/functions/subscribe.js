import { json, readBody, validRoom, validRole, saveSubscription } from "./_shared.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, role, subscription } = body || {};

  if (!validRoom(room) || !validRole(role) ||
      !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return json({ error: "Data subscription tidak valid" }, 400);
  }

  try {
    await saveSubscription(room.toLowerCase(), role, subscription);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal menyimpan subscription" }, 500);
  }
};
