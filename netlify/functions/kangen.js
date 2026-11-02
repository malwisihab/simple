import { json, readBody, validRoom, validRole, pushToPartner } from "./_shared.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, sender, tone } = body || {};
  if (!validRoom(room) || !validRole(sender)) {
    return json({ error: "Room atau role tidak valid" }, 400);
  }

  try {
    const result = await pushToPartner(room.toLowerCase(), sender, {
      type: "KANGEN_ALERT",
      title: sender === "cowo" ? "Cowomu lagi kangen ♥" : "Cewemu lagi kangen ♥",
      body: "Pasanganmu baru saja menekan tombol KANGEN.",
      tone: typeof tone === "string" ? tone : "kalimba",
      url: "./index.html"
    });
    return json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal mengirim notifikasi" }, 500);
  }
};
