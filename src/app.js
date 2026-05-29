// 🔥 PERBAIKAN: Hanya panggil dotenv jika jalan di laptop lokal
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache'); // 🔥 1. Import Cache

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 3. Buat Mesin Cache
const myCache = new NodeCache({ stdTTL: 180 });

// ⚠️ Array untuk menyimpan token (Untuk testing).
// Ingat: Di Vercel, data di dalam array ini akan reset jika server sedang tidak diakses/sleep!
let savedPushTokens = []; 

// Debug: Cek apakah kunci terbaca saat server menyala
console.log("=== SISTEM START ===");
console.log("API_KEY status:", process.env.API_KEY ? "TERBACA" : "GAGAL (KOSONG)");

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

// Halaman utama agar tidak "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Server Boltstats Berjalan!');
});

// === API LAMA: AMBIL STATISTIK & FORMASI LIVE (ANTI-LIMIT) ===
app.get('/api/matches/stats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gunakan ID pertandingan sebagai nama kunci di memori
    const cacheKey = `stats_match_${id}`; 
    
    // 1. Cek apakah satpam masih ingat data pertandingan ini
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ [CACHE] Mengirim data stat lokal untuk match ID: ${id}`);
      return res.json(cachedData);
    }

    // 2. Kalau memori kosong/kadaluarsa, baru tembak API
    console.log(`🌍 [API] Menarik data stat baru untuk match ID: ${id}...`);
    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?id=${id}`, {
      headers: {
        'x-apisports-key': process.env.API_KEY 
      }
    });
    
    const dataToSend = response.data.response[0];

    // 3. Simpan data baru ini ke memori
    if (dataToSend) {
      myCache.set(cacheKey, dataToSend);
    }
    
    // Kirim data langsung ke frontend
    res.json(dataToSend);
  } catch (error) {
    console.error('Error fetching live stats:', error.message);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

// ==========================================
// 🔥 API NOTIFIKASI 1: MENERIMA TOKEN DARI HP
// ==========================================
app.post('/api/save-token', async (req, res) => {
  const { pushToken } = req.body;

  if (!pushToken) {
    return res.status(400).json({ error: "Token tidak ditemukan" });
  }

  // 🔥 JURUS ANTI-ERROR VERCEL: Import Expo secara dinamis di sini
  const { Expo } = await import('expo-server-sdk');

  // Cek validitas format token ala Expo
  if (!Expo.isExpoPushToken(pushToken)) {
    return res.status(400).json({ error: "Push token tidak valid" });
  }

  // Simpan token ke array jika belum ada
  if (!savedPushTokens.includes(pushToken)) {
    savedPushTokens.push(pushToken);
    console.log("✅ Token HP baru berhasil disimpan ke server:", pushToken);
  }

  res.json({ success: true, message: "Token berhasil disimpan di server" });
});

// ==========================================
// 🔥 API NOTIFIKASI 2: MENEMBAK NOTIFIKASI KE SEMUA HP
// ==========================================
app.post('/api/send-notification', async (req, res) => {
  const { title, body, data } = req.body;

  if (savedPushTokens.length === 0) {
    return res.status(400).json({ error: "Belum ada token HP yang tersimpan" });
  }

  // 🔥 JURUS ANTI-ERROR VERCEL: Import dan inisialisasi Expo secara dinamis di sini
  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();

  let messages = [];
  for (let pushToken of savedPushTokens) {
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title || 'Notifikasi dari Boltstats! ⚽',
      body: body || 'Ada update pertandingan terbaru!',
      data: data || { matchId: null },
    });
  }

  try {
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    console.log("🚀 Notifikasi sukses ditembakkan ke", savedPushTokens.length, "perangkat!");
    res.json({ success: true, message: "Notifikasi sukses ditembakkan!" });
  } catch (error) {
    console.error("❌ Gagal mengirim notifikasi:", error);
    res.status(500).json({ error: "Gagal mengirim notifikasi" });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  });
}

// WAJIB DITAMBAHKAN UNTUK VERCEL:
module.exports = app;