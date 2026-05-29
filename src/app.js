// Konfigurasi Environment Lokal
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

// Inisialisasi Firebase
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

// === DEBUGGER GLOBAL ===
app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// === ENDPOINT DASAR ===
app.get('/', (req, res) => res.send("Server Boltstats Berjalan & Terhubung ke Firestore!"));

// === TEST ROUTE STANDINGS ===
app.get('/api/standings/test', (req, res) => {
  res.json({ message: "standings route aktif!" });
});

// === ROUTES ===
console.log("📌 Mendaftarkan routes...");
app.use('/api/matches', require('./routes/matches.js'));
console.log("✅ /api/matches terdaftar");
app.use('/api/prediction', require('./routes/prediction.js'));
console.log("✅ /api/prediction terdaftar");
app.use('/api/standings', require('./routes/standings.js'));
console.log("✅ /api/standings terdaftar");

// === ENDPOINT SAVE TOKEN ===
app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "Token diperlukan" });
  await db.collection('push_tokens').doc(pushToken).set({ token: pushToken });
  res.json({ success: true });
});

// === PENANGANAN 404 ===
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} tidak ditemukan di server.` });
});

module.exports = app;