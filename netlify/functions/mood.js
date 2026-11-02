import {
  json, readBody, validRoom, validRole, resolveEventId,
  loadState, saveState, guard, pushToPartner
} from "./_shared.js";

// Kunci = isi data-mood di index.html, nilai = kalimat untuk notifikasi
const MOODS = {
  "Lagi Santai": "sedang santai 😌",
  "Lagi Makan": "sedang makan 🍽️",
  "Lagi Sibuk": "sedang sibuk 🥺",
  "Mau Bobo": "mau bobo 😴",
  "Lagi Nonton": "sedang nonton 🎬",
  "OTW Pulang": "OTW pulang 🏠",
  "Kangen Banget": "kangen banget ❤️"
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, sender, mood, eventId } = body || {};

  if (!validRoom(room) || !validRole(sender) ||
      typeof mood !== "string" || !Object.prototype.hasOwnProperty.call(MOODS, mood)) {
    return json({ error: "Data status tidak valid" }, 400);
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

    if (state.mood[sender] === mood) {
      await saveState(roomKey, state);
      return json({ ok: true, sent: false, reason: "unchanged" });
    }

    state.mood[sender] = mood;
    await saveState(roomKey, state);

    const result = await pushToPartner(roomKey, sender, {
      type: "MOOD_UPDATE",
      title: "Update dari pasanganmu",
      body: `Pasanganmu sekarang ${MOODS[mood]}`,
      tag: "mood-update",
      eventId: id,
      mood: mood,
      url: "./index.html"
    }, { ttl: 3600 });

    return json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal mengirim notifikasi status" }, 500);
  }
};