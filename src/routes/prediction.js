const express = require('express');
const router = express.Router();
const axios = require('axios');
const { generatePrediction } = require('../services/aiPrediction');
const NodeCache = require('node-cache'); // 🔥 1. Import Cache

// 🔥 2. Buat Mesin Cache (Simpan memori selama 5 menit / 300 detik)
const cache = new NodeCache({ stdTTL: 300 });

router.get('/:id', async (req, res) => {
  const matchId = req.params.id;
  const cacheKey = `prediction_match_${matchId}`;

  // 🔥 3. Cek apakah satpam masih ingat prediksi AI untuk match ini
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`⚡ [CACHE] Mengirim prediksi AI match ${matchId} dari memori (Hemat kuota API-Sports & Gemini!)`);
    return res.json(cachedData);
  }
  
  // Mengambil langsung dari global process.env
  const apiKey = process.env.API_KEY; 
  
  console.log(`\n=== PROSES PREDIKSI: ${matchId} ===`);
  
  if (!apiKey) {
    console.error("❌ ERROR: API_KEY kosong di route prediksi");
    return res.status(500).json({ error: "Server tidak memiliki API_KEY" });
  }

  try {
    // 1. Ambil data dari API-Sports
    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?id=${matchId}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    
    const matchDataArray = response.data.response;
    if (!matchDataArray || matchDataArray.length === 0) {
        return res.status(404).json({ error: "Pertandingan tidak ditemukan" });
    }
    
    const matchData = matchDataArray[0];
    
    // 2. Kirim ke Gemini AI
    const aiResult = await generatePrediction(matchData);

    // 🔥 4. Simpan hasil analisis Gemini ini ke ingatan satpam
    cache.set(cacheKey, aiResult);

    res.json(aiResult);

  } catch (error) {
      console.error("--- ERROR PROSES PREDIKSI ---");
      if (error.response) {
        console.error("❌ Ditolak oleh API (Status:", error.response.status, ")");
        console.error("📄 Detail:", JSON.stringify(error.response.data));
      } else {
        console.error("❌ Pesan Error System:", error.message);
      }
      
      res.status(500).json({ error: "Gagal memproses prediksi" });
    }
});

module.exports = router;