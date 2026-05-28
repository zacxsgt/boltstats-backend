const path = require('path');
// Memuat .env dengan path absolut agar selalu ketemu
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache'); // 🔥 1. Import Cache

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 2. Buat Mesin Cache (Menyimpan data selama 180 detik / 3 menit)
const myCache = new NodeCache({ stdTTL: 180 });

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

// === API BARU: AMBIL STATISTIK & FORMASI LIVE (ANTI-LIMIT) ===
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

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});