const express = require('express');
const router = express.Router();
const axios = require('axios');
const { generatePrediction } = require('../services/aiPrediction');

router.get('/:id', async (req, res) => {
  const matchId = req.params.id;
  const apiKey = process.env.API_KEY; 
  
  console.log(`\n=== PROSES PREDIKSI: ${matchId} ===`);
  
  if (!apiKey) {
    console.error("❌ ERROR: API_KEY kosong di route prediksi");
    return res.status(500).json({ error: "Server tidak memiliki API_KEY" });
  }

  try {
    // Siapkan "Kunci Pas" untuk API
    const config = { headers: { 'x-apisports-key': apiKey } };

    // 1. TAHAP PERTAMA: Ambil data utama pertandingan
    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?id=${matchId}`, config);
    
    // DETEKTIF: Cek apakah limit API habis
    if (response.data.errors && Object.keys(response.data.errors).length > 0) {
      console.error("❌ API-SPORTS ERROR:", response.data.errors);
      return res.status(402).json({ error: "Limit API-Sports habis atau diblokir", detail: response.data.errors });
    }

    const matchDataArray = response.data.response;
    if (!matchDataArray || matchDataArray.length === 0) {
      console.log("❌ DATA KOSONG: API-Sports tidak menemukan ID pertandingan ini.");
      return res.status(404).json({ error: "Pertandingan tidak ditemukan di server pusat" });
    }
    
    const matchData = matchDataArray[0];
    const homeId = matchData.teams.home.id;
    const awayId = matchData.teams.away.id;

    console.log("✅ Data utama ditemukan! Mengumpulkan data H2H dan Cedera...");

    // 2. TAHAP KEDUA: Tarik data ekstra (H2H dan Cedera) secara BERSAMAAN (Biar tidak loading lama)
    // Gunakan .catch agar jika data cedera kosong, server tidak crash
    const [h2hRes, injuriesRes] = await Promise.all([
      axios.get(`https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}`, config).catch(() => ({ data: { response: [] } })),
      axios.get(`https://v3.football.api-sports.io/injuries?fixture=${matchId}`, config).catch(() => ({ data: { response: [] } }))
    ]);

    // Bungkus semua data tambahan ini ke dalam satu koper (extraData)
    const extraData = {
      h2hData: h2hRes.data.response || [],
      injuriesData: injuriesRes.data.response || []
    };

    console.log(`✅ Sukses! Ditemukan ${extraData.h2hData.length} laga H2H dan ${extraData.injuriesData.length} data cedera.`);
    console.log("🤖 Menyuapkan data ke Gemini AI...");

    // 3. TAHAP KETIGA: Berikan SEMUA data tersebut ke AI
    const aiResult = await generatePrediction(matchData, extraData);
    res.json(aiResult);

  } catch (error) {
    console.error("--- ERROR PROSES PREDIKSI ---");
    if (error.response) {
      console.error("❌ Ditolak oleh API (Status:", error.response.status, ")");
    } else {
      console.error("❌ Pesan Error System:", error.message);
    }
    res.status(500).json({ error: "Gagal memproses prediksi" });
  }
});

module.exports = router;