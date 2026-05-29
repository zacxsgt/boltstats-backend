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

// === DEBUGGER GLOBAL (Agar kita tahu apa yang Vercel baca) ===
app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// === ROUTES ===
// Tambahkan ekstensi .js di belakangnya untuk mencegah error Vercel
app.use('/api/matches', require('./routes/matches.js'));
app.use('/api/prediction', require('./routes/prediction.js'));
app.use('/api/standings', require('./routes/standings.js')); 

// Endpoint Dasar
app.get('/', (req, res) => res.send("Server Boltstats Berjalan & Terhubung ke Firestore!"));

// Endpoint Save Token
app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "Token diperlukan" });
  await db.collection('push_tokens').doc(pushToken).set({ token: pushToken });
  res.json({ success: true });
});

// Penanganan 404 jika rute benar-benar tidak ada
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} tidak ditemukan di server.` });
});

module.exports = app;