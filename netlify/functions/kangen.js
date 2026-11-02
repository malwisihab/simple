import {
  json, readBody, validRoom, validRole, resolveEventId,
  loadState, saveState, guard, pushToPartner
} from "./_shared.js";

const TONES = ["kalimba", "musicbox", "heartbeat", "piano", "bell", "harp", "marimba", "sparkle", "lullaby", "dingdong"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const { room, sender, tone, eventId } = body || {};
  if (!validRoom(room) || !validRole(sender)) {
    return json({ error: "Room atau role tidak valid" }, 400);
  }

  const roomKey = room.toLowerCase();
  const id = resolveEventId(eventId);
  const safeTone = TONES.includes(tone) ? tone : "kalimba";

  try {
    const state = await loadState(roomKey);

    const blocked = guard(state, id);
    if (blocked === "duplicate") {
      return json({ ok: true, duplicate: true, sent: false, count: state.kangen[sender] });
    }
    if (blocked === "rate_limited") {
      return json({ error: "Terlalu cepat, coba lagi sebentar", reason: "rate_limited" }, 429);
    }

    state.kangen[sender] += 1;
    const count = state.kangen[sender];
    await saveState(roomKey, state);

    const result = await pushToPartner(roomKey, sender, {
      type: "KANGEN_ALERT",
      title: "Pasanganmu lagi kangen ❤️",
      body: `Kangen ke-${count} kali hari ini`,
      tag: `kangen-${id}`,
      eventId: id,
      tone: safeTone,
      url: "./index.html"
    }, { ttl: 300 });

    return json({ ok: true, count, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: "Gagal mengirim notifikasi" }, 500);
  }
};