const express = require('express');
const router = express.Router();
const { footballApi, getMatchStats } = require('../services/footballApi');
const NodeCache = require('node-cache'); // 🔥 1. Import Cache

// 🔥 2. Buat Mesin Cache (Simpan memori selama 300 detik / 5 menit)
const cache = new NodeCache({ stdTTL: 300 });

// Endpoint untuk mendapatkan jadwal bola hari ini
router.get('/today', async (req, res) => {
  const cacheKey = "matches_today";

  // 🔥 3. Cek apakah satpam masih ingat data hari ini
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`⚡ [CACHE] Mengirim jadwal hari ini dari memori (Super Cepat!)`);
    return res.json(cachedData);
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[DEBUG] Mencoba mengambil jadwal untuk tanggal: ${today}`);

    const response = await footballApi.get('/fixtures', {
      params: { date: today }
    });

    console.log(`[DEBUG] API-Sports berhasil merespons! Jumlah data: ${response.data.results}`);

    const dataToSend = {
      status: 'success',
      results: response.data.results,
      data: response.data.response
    };

    // 🔥 4. Simpan data baru ke ingatan satpam
    cache.set(cacheKey, dataToSend);

    res.json(dataToSend);
  } catch (error) {
    console.error('❌ ERROR DETAIL DARI API-SPORTS:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    } else {
      console.error('Message:', error.message);
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Gagal mengambil data jadwal pertandingan',
      debug: error.response?.data?.message || error.message 
    });
  }
});

// Endpoint Statistik
router.get('/:id', async (req, res) => {
  const matchId = req.params.id;
  const cacheKey = `match_stats_${matchId}`;

  // 🔥 3. Cek satpam untuk ID match spesifik ini
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`⚡ [CACHE] Mengirim statistik match ${matchId} dari memori`);
    return res.json(cachedData);
  }

  try {
    console.log(`[DEBUG] Mengambil statistik untuk match: ${matchId}`);
    const statsData = await getMatchStats(matchId); 
    
    // 🔥 4. Simpan data baru ke ingatan satpam
    cache.set(cacheKey, statsData);

    res.json(statsData);
  } catch (error) {
    console.error("❌ ERROR PADA ENDPOINT STATISTIK:", error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Gagal mengambil data statistik' 
    });
  }
});

module.exports = router;