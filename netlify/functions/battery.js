import { json, readBody, validRoom, validRole, pushToPartner } from "./_shared.js";

const ALLOWED = [5, 25, 50, 75, 100];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, sender, pct } = body || {};
  const value = Number(pct);

  if (!validRoom(room) || !validRole(sender) || !ALLOWED.includes(value)) {
    return json({ error: "Data baterai tidak valid" }, 400);
  }

  try {
    const result = await pushToPartner(room.toLowerCase(), sender, {
      type: "BATTERY_UPDATE",
      title: sender === "cowo" ? "Update baterai dari cowomu ♥" : "Update baterai dari cewemu ♥",
      body: `Energi cintanya sekarang ${value}%.`,
      pct: value,
      url: "./index.html"
    });
    return json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal mengirim notifikasi baterai" }, 500);
  }
};
