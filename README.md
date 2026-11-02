# ♡ SimpleCommunicate - Aesthetic White Couple Web App

Aplikasi pasangan dengan desain **Minimalist Aesthetic White** yang bersih, kalem, dan elegan, siap di-upload ke **Netlify** tanpa perlu backend.

---

## 📁 Struktur Folder

```text
SimpleCommunicate/
├── index.html              # Halaman utama (Aesthetic White UI)
├── netlify.toml            # Konfigurasi header Netlify
├── manifest.json           # Manifest PWA (Android & iOS)
├── sw.js                   # Service Worker offline cache
├── css/
│   └── style.css           # Styling aesthetic white & soft rose
├── js/
│   ├── audio.js            # Synthesizer nada Kalimba, Kotak Musik & Detak Jantung
│   └── app.js              # Real-time online, baterai cinta, bucket list & getar
└── assets/
    ├── icons/              # Ikon aplikasi PWA
    └── photos/             # Tempat naro foto kamu & pasangan
        ├── cowo.svg
        └── cewe.svg
```

---

## ✨ Fitur-Fitur Baru & Pembaruan

1. **Desain Aesthetic White & Soft Rose (Tidak Mencolok)**:
   - Dominasi warna putih bersih (`#ffffff` & `#f8f9fc`) dengan aksen soft rose yang lembut dan menenangkan.
   - Emote dibuat minimalis dan elegan, tidak norak atau berlebihan.
2. **Tombol Kangen dengan Nada & Getaran Manis**:
   - Saat tombol kangen ditekan, HP pasangan bergetar dengan ritme detak jantung ganda (`navigator.vibrate([250, 120, 250, 120, 500])`).
   - Terdengar lantunan **nada melodi akustik** yang menenangkan (pilihan: *Kalimba Manis*, *Kotak Musik Romantis*, atau *Detak Jantung Lembut*).
   - Ada tombol **"♪ Tes Nada"** agar kamu bisa langsung mencoba dan mendengarkan nadanya di browser/HP kamu!
3. **Penghitung Hari Bersama (Anniversary Counter)**:
   - Menghitung otomatis sudah berapa hari kalian bersama sejak tanggal jadian.
4. **Baterai Energi Cinta (Love Battery)**:
   - Tampilkan persentase energi cinta kamu hari ini (*25% Lelah Butuh Peluk*, *50% Sedang*, *75% Nyaman*, *100% Full Bucin*). Tersinkronisasi real-time!
5. **Rencana Kencan Berdua (Couple Bucket List)**:
   - Daftar impian kencan yang bisa dicentang bersama dan ditambah kapan saja secara real-time.
6. **Catatan Manis (Mini Chat)** & **Status Ringkas (Lagi Apa?)**.
7. **PWA Mobile**: Mendukung install aplikasi di home screen Android & iPhone.

---

## 🚀 Cara Upload ke Netlify:

1. Buka [app.netlify.com/drop](https://app.netlify.com/drop).
2. Tarik dan lepas (drag & drop) folder **`SimpleCommunicate`** ke kotak Netlify.
3. Bagikan link website ke pasanganmu!
