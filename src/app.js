// Konfigurasi Environment Lokal
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');

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

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// === ENDPOINT DASAR ===
app.get('/', (req, res) => res.send("Server Boltstats Berjalan & Terhubung ke Firestore!"));

// === STANDINGS LANGSUNG DI APP.JS ===
app.get('/api/standings/:leagueId/:season', async (req, res) => {
  const { leagueId, season } = req.params;
  console.log(`[STANDINGS] Liga: ${leagueId}, Musim: ${season}`);
  try {
    const response = await axios.get('https://v3.football.api-sports.io/standings', {
      headers: { 'x-apisports-key': process.env.API_KEY },
      params: { league: leagueId, season: season }
    });
    res.json(response.data);
  } catch (error) {
    console.error("ERROR STANDINGS:", error.message);
    res.status(500).json({ error: 'Gagal ambil klasemen', detail: error.message });
  }
});

// === ROUTES FILE TERPISAH ===
app.use('/api/matches', require('./routes/matches.js'));
app.use('/api/prediction', require('./routes/prediction.js'));

// === SAVE TOKEN ===
app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "Token diperlukan" });
  await db.collection('push_tokens').doc(pushToken).set({ token: pushToken });
  res.json({ success: true });
});

// === CONTOH PENGGUNAAN EXPO (DYNAMIC IMPORT) ===
// Jika Anda nantinya ingin menambahkan fungsi kirim notifikasi, gunakan cara ini:
async function sendPushNotification(title, body) {
  try {
    // PENTING: Import dipanggil dengan 'await import' di dalam fungsi, bukan di paling atas
    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();
    // ... jalankan logika notifikasi di sini ...
  } catch (error) {
    console.error("Gagal menjalankan Expo:", error);
  }
}

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} tidak ditemukan` });
});

module.exports = app;