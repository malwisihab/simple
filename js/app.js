// ========================================================
// SimpleCommunicate - Minimalist Aesthetic Couple Logic
// Realtime (MQTT) + Web Push (notif saat app ditutup)
// ========================================================

(function () {
  'use strict';

  // Storage Keys
  const KEY_ROLE = 'simplecom_user_role';
  const KEY_ROOM = 'simplecom_room_code';
  const KEY_COUNT = 'simplecom_kangen_count';
  const KEY_DATE = 'simplecom_kangen_date';
  const KEY_NOTES = 'simplecom_notes';
  const KEY_PHOTO_COWO = 'simplecom_photo_cowo';
  const KEY_PHOTO_CEWE = 'simplecom_photo_cewe';
  const KEY_ANNIVERSARY = 'simplecom_anniversary';
  const KEY_BATTERY_MINE = 'simplecom_battery_mine';
  const KEY_BUCKET = 'simplecom_bucket_list';

  // Durasi bunyi minimal (ms) saat tombol kangen dipencet / diterima
  const MIN_ALERT_MS = 3000;
  const ALERT_GAP_MS = 1200;
  const ALERT_MAX_REPEATS = 8;

  // App State
  let currentRole = localStorage.getItem(KEY_ROLE) || 'cowo';
  let currentRoom = (localStorage.getItem(KEY_ROOM) || 'love2024').toLowerCase().trim();
  let partnerLastSeen = 0;
  let client = null;
  let targetPhotoUploadRole = null;
  let kangenAlertLoop = null;
  let localSoundLoop = null;

  // Default Bucket List
  const defaultBucketList = [
    { id: 1, text: 'Nonton film bioskop bareng', checked: false },
    { id: 2, text: 'Kulineran malam berdua', checked: false },
    { id: 3, text: 'Piknik santai di taman', checked: false },
    { id: 4, text: 'Teleponan sampai ketiduran', checked: false }
  ];

  // DOM Elements
  const connDot = document.getElementById('conn-dot');
  const connText = document.getElementById('conn-text');
  const soundBtn = document.getElementById('sound-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const roomCodeInput = document.getElementById('room-code-input');
  const roomCodeLabel = document.getElementById('room-code-label');
  const roomPinDisplay = document.getElementById('room-pin-display');
  const roleBtnCowo = document.getElementById('role-btn-cowo');
  const roleBtnCewe = document.getElementById('role-btn-cewe');
  const anniversaryInput = document.getElementById('anniversary-input');
  const daysBannerBtn = document.getElementById('days-banner-btn');
  const daysCountLabel = document.getElementById('days-count-label');

  const boxCowo = document.getElementById('box-cowo');
  const boxCewe = document.getElementById('box-cewe');
  const avatarCowo = document.getElementById('avatar-cowo');
  const avatarCewe = document.getElementById('avatar-cewe');
  const badgeCowoYou = document.getElementById('badge-cowo-you');
  const badgeCeweYou = document.getElementById('badge-cewe-you');
  const pingCowo = document.getElementById('ping-cowo');
  const pingCewe = document.getElementById('ping-cewe');
  const moodCowo = document.getElementById('mood-cowo');
  const moodCewe = document.getElementById('mood-cewe');

  const kangenTriggerBtn = document.getElementById('kangen-trigger-btn');
  const kangenCounter = document.getElementById('kangen-counter');
  const testToneBtn = document.getElementById('test-tone-btn');

  const batteryPctCowo = document.getElementById('battery-pct-cowo');
  const batteryPctCewe = document.getElementById('battery-pct-cewe');
  const batteryFillCowo = document.getElementById('battery-fill-cowo');
  const batteryFillCewe = document.getElementById('battery-fill-cewe');

  const bucketListContainer = document.getElementById('bucket-list-container');
  const bucketForm = document.getElementById('bucket-form');
  const bucketInput = document.getElementById('bucket-input');

  const notesList = document.getElementById('notes-list');
  const noteForm = document.getElementById('note-form');
  const noteInput = document.getElementById('note-input');

  const kangenAlertModal = document.getElementById('kangen-alert-modal');
  const alertSenderName = document.getElementById('alert-sender-name');
  const alertDismissBtn = document.getElementById('alert-dismiss-btn');
  const floatingHeartsLayer = document.getElementById('floating-hearts-layer');

  const photoFileInput = document.getElementById('photo-file-input');
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');

  const enablePushBtn = document.getElementById('enable-push-btn');
  const pushStatus = document.getElementById('push-status');

  // ---------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------
  function init() {
    setupRoleUI();
    loadCustomPhotos();
    initCounter();
    initAnniversaryDays();
    initBattery();
    loadBucketList();
    loadNotes();
    setupEventListeners();
    connectMQTT();
    setupPWA();
    refreshPushStatus();
    syncPushSubscription(false);

    // Heartbeat ticker
    setInterval(checkPartnerPresence, 5000);
    setInterval(sendPresencePing, 10000);

    // Saat app dibuka lagi dari homescreen / balik dari background -> sambung ulang
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (client && !client.connected) client.reconnect();
        sendPresencePing();
        syncPushSubscription(false);
      }
    });
  }

  // ---------------------------------------------
  // ROLE & PROFILE UI
  // ---------------------------------------------
  function setupRoleUI() {
    roomCodeLabel.textContent = currentRoom;
    roomCodeInput.value = currentRoom;

    if (currentRole === 'cowo') {
      boxCowo.classList.add('active-role');
      boxCewe.classList.remove('active-role');
      badgeCowoYou.style.display = 'inline';
      badgeCeweYou.style.display = 'none';
      pingCowo.innerHTML = '🟢 Online (Kamu)';

      roleBtnCowo.classList.add('selected');
      roleBtnCewe.classList.remove('selected');
    } else {
      boxCewe.classList.add('active-role');
      boxCowo.classList.remove('active-role');
      badgeCeweYou.style.display = 'inline';
      badgeCowoYou.style.display = 'none';
      pingCewe.innerHTML = '🟢 Online (Kamu)';

      roleBtnCewe.classList.add('selected');
      roleBtnCowo.classList.remove('selected');
    }

    // Set tone button active in settings
    const activeTone = window.soundManager ? window.soundManager.currentTone : 'kalimba';
    document.querySelectorAll('.tone-opt-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-tone') === activeTone);
    });
  }

  function loadCustomPhotos() {
    const savedCowo = localStorage.getItem(KEY_PHOTO_COWO);
    const savedCewe = localStorage.getItem(KEY_PHOTO_CEWE);
    if (savedCowo) avatarCowo.src = savedCowo;
    if (savedCewe) avatarCewe.src = savedCewe;
  }

  // ---------------------------------------------
  // ANNIVERSARY DAYS CALCULATOR
  // ---------------------------------------------
  function initAnniversaryDays() {
    let savedDate = localStorage.getItem(KEY_ANNIVERSARY);
    if (!savedDate) {
      const d = new Date();
      d.setDate(d.getDate() - 100);
      savedDate = d.toISOString().split('T')[0];
      localStorage.setItem(KEY_ANNIVERSARY, savedDate);
    }
    anniversaryInput.value = savedDate;
    calculateDays(savedDate);
  }

  function calculateDays(dateStr) {
    if (!dateStr) return;
    const start = new Date(dateStr);
    const today = new Date();
    const diffTime = today - start;
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    daysCountLabel.textContent = `${diffDays} Hari`;
  }

  // ---------------------------------------------
  // LOVE BATTERY
  // ---------------------------------------------
  function initBattery() {
    const myPct = localStorage.getItem(KEY_BATTERY_MINE) || '100';
    updateBatteryUI(currentRole, myPct);

    document.querySelectorAll('.battery-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-pct') === myPct);
    });
  }

  function setMyBattery(pct) {
    const eventId = newEventId();
    localStorage.setItem(KEY_BATTERY_MINE, pct);
    updateBatteryUI(currentRole, pct);

    publishMessage({
      type: 'BATTERY_UPDATE',
      sender: currentRole,
      pct: pct,
      eventId: eventId,
      timestamp: Date.now()
    });

    sendBatteryPush(pct, eventId);
  }

  function updateBatteryUI(role, pct) {
    const fillEl = role === 'cowo' ? batteryFillCowo : batteryFillCewe;
    const labelEl = role === 'cowo' ? batteryPctCowo : batteryPctCewe;
    fillEl.style.width = `${pct}%`;
    labelEl.textContent = `${pct}%`;
  }

  // ---------------------------------------------
  // COUPLE BUCKET LIST (WISH KENCAN)
  // ---------------------------------------------
  function loadBucketList() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY_BUCKET) || '[]');
    } catch (e) {
      list = [];
    }
    if (list.length === 0) {
      list = defaultBucketList;
      localStorage.setItem(KEY_BUCKET, JSON.stringify(list));
    }
    renderBucketList(list);
  }

  function renderBucketList(list) {
    bucketListContainer.innerHTML = '';
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = `bucket-item ${item.checked ? 'checked' : ''}`;
      el.innerHTML = `
        <div class="bucket-checkbox">${item.checked ? '✓' : ''}</div>
        <span class="bucket-text">${escapeHtml(item.text)}</span>
        <button type="button" class="bucket-delete-btn" aria-label="Hapus rencana" title="Hapus">✕</button>
      `;
      el.addEventListener('click', () => toggleBucketItem(item.id));

      // Tombol hapus (jangan ikut men-centang item)
      el.querySelector('.bucket-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBucketItem(item.id);
      });

      bucketListContainer.appendChild(el);
    });
  }

  function toggleBucketItem(id) {
    let list = JSON.parse(localStorage.getItem(KEY_BUCKET) || '[]');
    list = list.map(item => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    localStorage.setItem(KEY_BUCKET, JSON.stringify(list));
    renderBucketList(list);

    publishMessage({
      type: 'BUCKET_SYNC',
      sender: currentRole,
      list: list,
      timestamp: Date.now()
    });

    if (window.soundManager) window.soundManager.playSoftTap();
  }

  function addBucketItem(text) {
    if (!text.trim()) return;
    let list = JSON.parse(localStorage.getItem(KEY_BUCKET) || '[]');
    const newItem = { id: Date.now(), text: text.trim(), checked: false };
    list.push(newItem);
    localStorage.setItem(KEY_BUCKET, JSON.stringify(list));
    renderBucketList(list);

    publishMessage({
      type: 'BUCKET_SYNC',
      sender: currentRole,
      list: list,
      timestamp: Date.now()
    });

    if (window.soundManager) window.soundManager.playSoftTap();
  }

  function deleteBucketItem(id) {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY_BUCKET) || '[]');
    } catch (e) {
      list = [];
    }
    list = list.filter(item => String(item.id) !== String(id));
    localStorage.setItem(KEY_BUCKET, JSON.stringify(list));
    renderBucketList(list);

    publishMessage({
      type: 'BUCKET_SYNC',
      sender: currentRole,
      list: list,
      timestamp: Date.now()
    });

    if (window.soundManager) window.soundManager.playSoftTap();
  }

  // ---------------------------------------------
  // KANGEN COUNTER
  // ---------------------------------------------
  function initCounter() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(KEY_DATE);
    if (savedDate !== today) {
      localStorage.setItem(KEY_DATE, today);
      localStorage.setItem(KEY_COUNT, '0');
      kangenCounter.textContent = '0';
    } else {
      kangenCounter.textContent = localStorage.getItem(KEY_COUNT) || '0';
    }
  }

  function setCounter(n) {
    localStorage.setItem(KEY_DATE, new Date().toDateString());
    localStorage.setItem(KEY_COUNT, String(n));
    kangenCounter.textContent = n;
  }

  function incrementCounter() {
    let count = parseInt(localStorage.getItem(KEY_COUNT) || '0', 10);
    count += 1;
    localStorage.setItem(KEY_COUNT, count.toString());
    kangenCounter.textContent = count;
  }

  // ---------------------------------------------
  // SOUND HELPERS (durasi minimal 3 detik)
  // ---------------------------------------------
  function stopLocalSound() {
    if (localSoundLoop) {
      clearInterval(localSoundLoop);
      localSoundLoop = null;
    }
  }

  function playAlertForAtLeast(tone, minMs) {
    stopLocalSound();
    const sm = window.soundManager;
    if (!sm) return;
    const start = Date.now();
    sm.playKangenAlert(tone);
    localSoundLoop = setInterval(() => {
      if (Date.now() - start >= minMs - ALERT_GAP_MS) {
        stopLocalSound();
        return;
      }
      sm.playKangenAlert(tone);
    }, ALERT_GAP_MS);
  }

  // ---------------------------------------------
  // REALTIME MQTT (ZERO-BACKEND OVER WSS)
  // ---------------------------------------------
  function getTopic() {
    return `simplecom/v2/room/${currentRoom}`;
  }

  function getPhotoTopicPrefix() {
    return `${getTopic()}/photo/`;
  }

  function connectMQTT() {
    updateConnStatus('connecting', 'Menghubungkan...');

    const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
    const clientId = `client_${currentRole}_${Math.random().toString(16).substring(2, 8)}`;

    try {
      client = mqtt.connect(brokerUrl, {
        clientId: clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 3000
      });

      client.on('connect', () => {
        updateConnStatus('online', 'Terhubung');
        client.subscribe(getTopic(), { qos: 0 }, (err) => {
          if (!err) {
            sendPresencePing();
          }
        });
        // Foto profil (retained, jadi pasangan yang offline tetap dapat)
        client.subscribe(`${getPhotoTopicPrefix()}+`, { qos: 0 });
      });

      client.on('message', (topic, message) => {
        try {
          if (topic.startsWith(getPhotoTopicPrefix())) {
            const role = topic.split('/').pop();
            const dataUrl = message.toString();
            if (dataUrl.startsWith('data:image/')) applyPhoto(role, dataUrl);
            return;
          }
          const data = JSON.parse(message.toString());
          handleIncomingMessage(data);
        } catch (e) {
          console.error('Packet error', e);
        }
      });

      client.on('reconnect', () => updateConnStatus('connecting', 'Menyambung...'));
      client.on('offline', () => updateConnStatus('offline', 'Offline'));
    } catch (e) {
      console.error('MQTT setup error', e);
      updateConnStatus('offline', 'Offline');
    }
  }

  function updateConnStatus(status, text) {
    connDot.className = `status-dot ${status}`;
    connText.textContent = text;
  }

  function publishMessage(payload) {
    if (!client || !client.connected) return;
    client.publish(getTopic(), JSON.stringify(payload), { qos: 0 });
  }

  function sendPresencePing() {
    const myBattery = localStorage.getItem(KEY_BATTERY_MINE) || '100';
    publishMessage({
      type: 'PRESENCE_PING',
      sender: currentRole,
      battery: myBattery,
      timestamp: Date.now()
    });
  }

  function checkPartnerPresence() {
    const partnerRole = currentRole === 'cowo' ? 'cewe' : 'cowo';
    const pingEl = partnerRole === 'cowo' ? pingCowo : pingCewe;
    const now = Date.now();

    if (partnerLastSeen > 0 && now - partnerLastSeen < 25000) {
      pingEl.innerHTML = '🟢 Terhubung';
      pingEl.style.color = '#10b981';
    } else {
      pingEl.innerHTML = '⚪ Offline';
      pingEl.style.color = 'var(--text-muted)';
    }
  }

  // ---------------------------------------------
  // WEB PUSH (notifikasi saat app ditutup)
  // ---------------------------------------------
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function setPushStatus(text, enabled) {
    if (pushStatus) pushStatus.textContent = text;
    if (enablePushBtn) {
      enablePushBtn.textContent = enabled ? '🔔 Notifikasi Aktif ✓' : '🔔 Aktifkan Notifikasi';
    }
  }

  function refreshPushStatus() {
    if (!enablePushBtn) return;
    if (!pushSupported()) {
      if (isIOS() && !isStandalone()) {
        setPushStatus('Di iPhone: buka lewat Safari > Bagikan > Tambah ke Layar Utama dulu, lalu buka dari homescreen.', false);
      } else {
        setPushStatus('Browser ini belum mendukung notifikasi.', false);
      }
      return;
    }
    if (Notification.permission === 'granted') {
      setPushStatus('Kamu akan dapat notif saat pasangan pencet Kangen, walau app ditutup.', true);
    } else if (Notification.permission === 'denied') {
      setPushStatus('Notifikasi diblokir. Aktifkan lewat pengaturan browser/HP untuk situs ini.', false);
    } else {
      setPushStatus('Klik tombol di atas untuk mengizinkan notifikasi.', false);
    }
  }

  async function syncPushSubscription(askPermission) {
    if (!pushSupported()) return false;

    if (Notification.permission === 'default' && askPermission) {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        refreshPushStatus();
        return false;
      }
    }
    if (Notification.permission !== 'granted') {
      refreshPushStatus();
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        if (!cfg.publicKey) throw new Error('VAPID public key belum diset');
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.publicKey)
        });
      }

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: currentRoom,
          role: currentRole,
          subscription: sub.toJSON()
        })
      });

      refreshPushStatus();
      return true;
    } catch (e) {
      console.error('Push subscribe error', e);
      setPushStatus('Gagal mengaktifkan notifikasi. Coba lagi nanti.', false);
      return false;
    }
  }

  function newEventId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  async function postApi(path, payload) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function sendPushToPartner(tone, eventId) {
    const data = await postApi('/api/kangen', {
      room: currentRoom,
      sender: currentRole,
      tone: tone,
      eventId: eventId
    });
    if (data && typeof data.count === 'number') setCounter(data.count);
  }

  async function sendBatteryPush(pct, eventId) {
    await postApi('/api/battery', {
      room: currentRoom,
      sender: currentRole,
      pct: Number(pct),
      eventId: eventId
    });
  }

  async function sendMoodPush(mood, eventId) {
    await postApi('/api/mood', {
      room: currentRoom,
      sender: currentRole,
      mood: mood,
      eventId: eventId
    });
  }

  // ---------------------------------------------
  // INCOMING MESSAGE HANDLERS
  // ---------------------------------------------
  function handleIncomingMessage(data) {
    if (data.sender === currentRole) return;

    partnerLastSeen = Date.now();
    const partnerRole = data.sender;
    const pingEl = partnerRole === 'cowo' ? pingCowo : pingCewe;
    pingEl.innerHTML = '🟢 Terhubung';
    pingEl.style.color = '#10b981';

    switch (data.type) {
      case 'PRESENCE_PING':
        if (data.battery) updateBatteryUI(partnerRole, data.battery);
        break;

      case 'KANGEN_ALERT':
        triggerKangenReceived(data);
        break;

      case 'BATTERY_UPDATE':
        updateBatteryUI(data.sender, data.pct);
        break;

      case 'MOOD_UPDATE':
        updatePartnerMoodUI(data.sender, data.mood);
        break;

      case 'BUCKET_SYNC':
        localStorage.setItem(KEY_BUCKET, JSON.stringify(data.list));
        renderBucketList(data.list);
        break;

      case 'LOVE_NOTE':
        addNoteToUI(data.sender, data.text, data.time, false);
        if (window.soundManager) window.soundManager.playNoteDing();
        break;
    }
  }

  function stopAlertLoop() {
    if (kangenAlertLoop) {
      clearInterval(kangenAlertLoop);
      kangenAlertLoop = null;
    }
  }

  function startAlertLoop(tone) {
    stopAlertLoop();
    let repeats = 0;
    kangenAlertLoop = setInterval(() => {
      repeats++;
      if (repeats > ALERT_MAX_REPEATS || !kangenAlertModal.classList.contains('show')) {
        stopAlertLoop();
        return;
      }
      if (window.soundManager) window.soundManager.playKangenAlert(tone);
    }, ALERT_GAP_MS);
  }

  function triggerKangenReceived(data) {
    const senderTitle = data.sender === 'cowo' ? 'Cowomu' : 'Cewemu';
    alertSenderName.textContent = senderTitle;

    if ('vibrate' in navigator) {
      navigator.vibrate([
        400, 150, 400, 150, 400, 150, 800, 300,
        400, 150, 400, 150, 400, 150, 800, 300,
        400, 150, 400, 150, 800
      ]);
    }

    stopLocalSound();
    if (window.soundManager) {
      window.soundManager.playKangenAlert(data.tone);
    }
    kangenAlertModal.classList.add('show');
    startAlertLoop(data.tone);

    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        spawnFloatingEmoji('♡');
      }, i * 110);
    }
  }

  function updatePartnerMoodUI(role, mood) {
    if (role === 'cowo') {
      moodCowo.textContent = mood;
    } else {
      moodCewe.textContent = mood;
    }
  }

  // ---------------------------------------------
  // USER ACTIONS
  // ---------------------------------------------
  function handleKangenClick() {
    const tone = window.soundManager ? window.soundManager.currentTone : 'kalimba';
    const eventId = newEventId();

    if ('vibrate' in navigator) {
      navigator.vibrate([120, 80, 120, 80, 200]);
    }

    playAlertForAtLeast(tone, MIN_ALERT_MS);

    spawnFloatingEmoji('♥');
    incrementCounter();

    publishMessage({
      type: 'KANGEN_ALERT',
      sender: currentRole,
      tone: tone,
      eventId: eventId,
      timestamp: Date.now()
    });

    sendPushToPartner(tone, eventId);
  }

  function handleMoodSelect(mood) {
    if (window.soundManager) window.soundManager.playSoftTap();
    const eventId = newEventId();

    if (currentRole === 'cowo') {
      moodCowo.textContent = mood;
    } else {
      moodCewe.textContent = mood;
    }

    publishMessage({
      type: 'MOOD_UPDATE',
      sender: currentRole,
      mood: mood,
      eventId: eventId,
      timestamp: Date.now()
    });

    sendMoodPush(mood, eventId);
  }

  function handleSendNote(text) {
    if (!text || !text.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    addNoteToUI(currentRole, text, timeStr, true);

    publishMessage({
      type: 'LOVE_NOTE',
      sender: currentRole,
      text: text,
      time: timeStr,
      timestamp: Date.now()
    });
  }

  // ---------------------------------------------
  // LOVE NOTES
  // ---------------------------------------------
  function loadNotes() {
    let notes = [];
    try {
      notes = JSON.parse(localStorage.getItem(KEY_NOTES) || '[]');
    } catch (e) {
      notes = [];
    }
    if (notes.length === 0) {
      notes = [
        { sender: 'cowo', text: 'Semangat hari ini yaa, kalau kangen tinggal pencet tombol hati ♡', time: '10:00' }
      ];
    }
    notesList.innerHTML = '';
    notes.forEach(n => renderNoteBubble(n.sender, n.text, n.time));
  }

  function addNoteToUI(sender, text, time, isMine) {
    renderNoteBubble(sender, text, time);

    let notes = [];
    try {
      notes = JSON.parse(localStorage.getItem(KEY_NOTES) || '[]');
    } catch (e) {
      notes = [];
    }
    notes.push({ sender, text, time });
    if (notes.length > 20) notes.shift();
    localStorage.setItem(KEY_NOTES, JSON.stringify(notes));

    notesList.scrollTop = notesList.scrollHeight;
  }

  function renderNoteBubble(sender, text, time) {
    const bubble = document.createElement('div');
    const isMine = sender === currentRole;
    bubble.className = `note-bubble ${isMine ? 'mine' : 'partner'}`;
    const senderName = sender === 'cowo' ? 'Cowo' : 'Cewe';

    bubble.innerHTML = `
      <div>${escapeHtml(text)}</div>
      <div class="note-meta">
        <span>${isMine ? 'Kamu' : senderName}</span>
        <span>${escapeHtml(time)}</span>
      </div>
    `;
    notesList.appendChild(bubble);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function spawnFloatingEmoji(emoji) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    el.textContent = emoji || '♡';

    const randomX = Math.random() * (window.innerWidth - 60) + 30;
    const randomY = window.innerHeight * 0.55 + (Math.random() * 80 - 40);

    el.style.left = `${randomX}px`;
    el.style.top = `${randomY}px`;
    floatingHeartsLayer.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1600);
  }

  // ---------------------------------------------
  // PHOTO UPLOAD & SYNC
  // ---------------------------------------------
  function applyPhoto(role, dataUrl) {
    if (role === 'cowo') {
      avatarCowo.src = dataUrl;
      try { localStorage.setItem(KEY_PHOTO_COWO, dataUrl); } catch (e) {}
    } else if (role === 'cewe') {
      avatarCewe.src = dataUrl;
      try { localStorage.setItem(KEY_PHOTO_CEWE, dataUrl); } catch (e) {}
    }
  }

  function handlePhotoUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 240;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        const roleToSave = targetPhotoUploadRole || currentRole;

        applyPhoto(roleToSave, compressed);

        if (client && client.connected) {
          client.publish(`${getPhotoTopicPrefix()}${roleToSave}`, compressed, {
            qos: 0,
            retain: true
          });
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------------------------
  // PWA REGISTRATION
  // ---------------------------------------------
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW err:', err));
    }
  }

  // ---------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------
  function setupEventListeners() {
    kangenTriggerBtn.addEventListener('click', handleKangenClick);

    testToneBtn.addEventListener('click', () => {
      playAlertForAtLeast(undefined, MIN_ALERT_MS);
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      spawnFloatingEmoji('♪');
    });

    alertDismissBtn.addEventListener('click', () => {
      kangenAlertModal.classList.remove('show');
      stopAlertLoop();
      stopLocalSound();
      if ('vibrate' in navigator) navigator.vibrate(0);
      if (window.soundManager) window.soundManager.playSoftTap();
    });

    soundBtn.addEventListener('click', () => {
      if (window.soundManager) {
        window.soundManager.isMuted = !window.soundManager.isMuted;
        soundBtn.textContent = window.soundManager.isMuted ? '🔇' : '🔊';
      }
    });

    document.querySelectorAll('.battery-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.battery-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setMyBattery(btn.getAttribute('data-pct'));
        if (window.soundManager) window.soundManager.playSoftTap();
      });
    });

    document.querySelectorAll('.mood-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        handleMoodSelect(chip.getAttribute('data-mood'));
      });
    });

    bucketForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = bucketInput.value;
      if (text) {
        addBucketItem(text);
        bucketInput.value = '';
      }
    });

    noteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = noteInput.value.trim();
      if (text) {
        handleSendNote(text);
        noteInput.value = '';
      }
    });

    daysBannerBtn.addEventListener('click', () => {
      settingsModal.classList.add('open');
    });

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
    roomPinDisplay.addEventListener('click', () => settingsModal.classList.add('open'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('open'));

    roleBtnCowo.addEventListener('click', () => {
      roleBtnCowo.classList.add('selected');
      roleBtnCewe.classList.remove('selected');
    });
    roleBtnCewe.addEventListener('click', () => {
      roleBtnCewe.classList.add('selected');
      roleBtnCowo.classList.remove('selected');
    });

    if (enablePushBtn) {
      enablePushBtn.addEventListener('click', async () => {
        if (!pushSupported()) {
          refreshPushStatus();
          return;
        }
        await syncPushSubscription(true);
      });
    }

    document.querySelectorAll('.tone-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tone-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const tone = btn.getAttribute('data-tone');
        if (window.soundManager) {
          window.soundManager.setTone(tone);
          window.soundManager.playKangenAlert(tone);
        }
      });
    });

    saveSettingsBtn.addEventListener('click', () => {
      const newRole = roleBtnCowo.classList.contains('selected') ? 'cowo' : 'cewe';
      const newRoom = (roomCodeInput.value || 'love2024').toLowerCase().trim();
      const newDate = anniversaryInput.value;
      if (!/^[a-z0-9_-]{4,40}$/.test(newRoom)) {
        alert('PIN harus 4-40 karakter: huruf, angka, tanda - atau _ (tanpa spasi).');
        return;
      }

      if (newDate) {
        localStorage.setItem(KEY_ANNIVERSARY, newDate);
        calculateDays(newDate);
      }

      const changedRoom = newRoom !== currentRoom;
      const changedRole = newRole !== currentRole;

      currentRole = newRole;
      currentRoom = newRoom;
      localStorage.setItem(KEY_ROLE, currentRole);
      localStorage.setItem(KEY_ROOM, currentRoom);

      setupRoleUI();
      settingsModal.classList.remove('open');

      if (changedRoom && client) {
        client.end(true, () => connectMQTT());
      } else if (changedRole) {
        sendPresencePing();
      }

      if (changedRoom || changedRole) syncPushSubscription(false);
    });

    boxCowo.addEventListener('click', () => {
      targetPhotoUploadRole = 'cowo';
      photoFileInput.click();
    });
    boxCewe.addEventListener('click', () => {
      targetPhotoUploadRole = 'cewe';
      photoFileInput.click();
    });
    uploadPhotoBtn.addEventListener('click', () => {
      targetPhotoUploadRole = currentRole;
      photoFileInput.click();
    });
    photoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePhotoUpload(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();