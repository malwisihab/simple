import {
  json, readBody, validRoom, validRole, resolveEventId,
  loadState, saveState, guard, pushToPartner
} from "./_shared.js";

const ALLOWED = [5, 25, 50, 75, 100];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, sender, pct, eventId } = body || {};
  const value = Number(pct);

  if (!validRoom(room) || !validRole(sender) || !ALLOWED.includes(value)) {
    return json({ error: "Data baterai tidak valid" }, 400);
  }

  const roomKey = room.toLowerCase();
  const id = resolveEventId(eventId);

  try {
    const state = await loadState(roomKey);

    const blocked = guard(state, id);
    if (blocked === "duplicate") return json({ ok: true, duplicate: true, sent: false });
    if (blocked === "rate_limited") {
      return json({ error: "Terlalu cepat, coba lagi sebentar", reason: "rate_limited" }, 429);
    }

    // Nilai sama dengan sebelumnya -> tidak ada perubahan, tidak perlu notif
    if (state.battery[sender] === value) {
      await saveState(roomKey, state);
      return json({ ok: true, sent: false, reason: "unchanged" });
    }

    state.battery[sender] = value;
    await saveState(roomKey, state);

    const result = await pushToPartner(roomKey, sender, {
      type: "BATTERY_UPDATE",
      title: "Update dari pasanganmu",
      body: `Energi pasanganmu sekarang ${value}% 🔋`,
      tag: "battery-update",
      eventId: id,
      pct: value,
      url: "./index.html"
    }, { ttl: 3600 });

    return json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal mengirim notifikasi baterai" }, 500);
  }
};