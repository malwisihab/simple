import { json, configurePush } from "./_shared.js";

export default async () => {
  try {
    return json({ publicKey: configurePush() });
  } catch (err) {
    console.error(err);
    return json({ error: "Push server belum dikonfigurasi" }, 500);
  }
};
