// 🔥 PERBAIKAN: Hanya panggil dotenv jika jalan di laptop lokal
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
const admin = require('firebase-admin');

// 1. Inisialisasi Firebase
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Cek agar tidak inisialisasi berkali-kali
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("🔥 Firebase Firestore Berhasil Terkoneksi!");
  } catch (error) {
    console.error("❌ Gagal menginisialisasi Firebase:", error);
  }
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 3. Buat Mesin Cache
const myCache = new NodeCache({ stdTTL: 180 });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const matchesRoute = require('./routes/matches');
const predictionRoute = require('./routes/prediction');
const standingsRoute = require('./routes/standings');

app.use('/api/matches', matchesRoute);
app.use('/api/prediction', predictionRoute);
app.use('/api/standings', standingsRoute);

app.get('/', (req, res) => {
  res.send('Server Boltstats Berjalan & Terhubung ke Firestore!');
});

// === API STATISTIK ===
app.get('/api/matches/stats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `stats_match_${id}`; 
    const cachedData = myCache.get(cacheKey);
    
    if (cachedData) return res.json(cachedData);

    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?id=${id}`, {
      headers: { 'x-apisports-key': process.env.API_KEY }
    });
    
    const dataToSend = response.data.response[0];
    if (dataToSend) myCache.set(cacheKey, dataToSend);
    
    res.json(dataToSend);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

// ==========================================
// 🔥 API NOTIFIKASI 1: SIMPAN KE FIREBASE
// ==========================================
app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "Token tidak ditemukan" });

  try {
    // Simpan ke Firestore
    await db.collection('push_tokens').doc(pushToken).set({
      token: pushToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Token tersimpan permanen di Firestore:", pushToken);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Gagal simpan ke database" });
  }
});

// ==========================================
// 🔥 API NOTIFIKASI 2: AMBIL DARI FIREBASE
// ==========================================
app.post('/api/send-notification', async (req, res) => {
  const { title, body, data } = req.body;
  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();

  try {
    // Ambil SEMUA token dari Firestore
    const snapshot = await db.collection('push_tokens').get();
    const savedPushTokens = snapshot.docs.map(doc => doc.id);

    if (savedPushTokens.length === 0) {
      return res.status(400).json({ error: "Database kosong" });
    }

    let messages = savedPushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'Notifikasi dari Boltstats! ⚽',
      body: body || 'Ada update pertandingan terbaru!',
      data: data || { matchId: null },
    }));

    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    
    res.json({ success: true, message: `Berhasil kirim ke ${savedPushTokens.length} perangkat` });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengirim notifikasi" });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
}

module.exports = app;