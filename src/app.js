// Konfigurasi Environment Lokal
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk'); // Import di atas agar lebih efisien

// 1. Inisialisasi Firebase
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    console.log("🔥 Firebase Firestore Berhasil Terkoneksi!");
  } catch (error) { console.error("❌ Gagal Inisialisasi Firebase:", error); }
}

const db = admin.firestore();
const app = express();
const expo = new Expo();

app.use(cors());
app.use(express.json());

// === UTILS: Fungsi Kirim Notifikasi ===
async function sendPushToAllTokens(title, body) {
  try {
    const snapshot = await db.collection('push_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);
    
    if (tokens.length === 0) return;

    const messages = tokens.map(token => ({ to: token, sound: 'default', title, body }));
    const chunks = expo.chunkPushNotifications(messages);
    
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`✅ Notifikasi Terkirim: ${title}`);
  } catch (err) {
    console.error("❌ Gagal kirim notifikasi:", err);
  }
}

// === API CRON: SI PENJAGA PINTAR (Smart Watcher) ===
app.get('/api/cron-check-matches', async (req, res) => {
  console.log("🕒 [Smart Watcher] Memulai pengecekan...");

  try {
    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?live=all`, {
      headers: { 'x-apisports-key': process.env.API_KEY }
    });
    
    const liveMatches = response.data.response || [];

    // FASE TIDUR (Idle): Tidak ada pertandingan live
    if (liveMatches.length === 0) {
      console.log("🌙 [Smart Watcher] Fase Tidur: Tidak ada pertandingan live. Berhenti.");
      return res.json({ status: "Tidur (Idle)", message: "Tidak ada pertandingan live" });
    }

    // FASE AKTIF (Match Mode): Memproses pertandingan
    console.log(`⚽ [Smart Watcher] Fase Aktif: ${liveMatches.length} pertandingan ditemukan.`);

    for (let match of liveMatches) {
      const matchId = match.fixture.id.toString();
      const docRef = db.collection('matches_state').doc(matchId);
      const doc = await docRef.get();
      
      const newScore = `${match.goals.home}-${match.goals.away}`;
      const homeName = match.teams.home.name;
      const awayName = match.teams.away.name;

      if (!doc.exists) {
        // Pertandingan baru, catat state awal saja (jangan spam notif gol awal)
        await docRef.set({ score: newScore, lastUpdated: new Date() });
      } else {
        const oldScore = doc.data().score;
        // Jika skor berubah, kirim notifikasi
        if (oldScore !== newScore) {
          console.log(`🔔 GOOOL! ${homeName} ${newScore} ${awayName}`);
          await sendPushToAllTokens("⚽ GOOOL!", `${homeName} ${newScore} ${awayName}`);
          await docRef.update({ score: newScore, lastUpdated: new Date() });
        }
      }
    }
    
    res.json({ success: true, processed: liveMatches.length });
  } catch (error) {
    console.error("❌ Error Cron Job:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === ROUTES LAINNYA ===
app.use('/api/matches', require('./routes/matches'));
app.use('/api/prediction', require('./routes/prediction'));
app.use('/api/standings', require('./routes/standings'));

// Endpoint Dasar untuk cek server hidup
app.get('/', (req, res) => res.send("Server Boltstats Berjalan & Terhubung ke Firestore!"));

app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "Token diperlukan" });
  await db.collection('push_tokens').doc(pushToken).set({ token: pushToken });
  res.json({ success: true });
});

module.exports = app;