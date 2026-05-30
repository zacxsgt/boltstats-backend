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
    const response = await axios.get(`https://v3.football.api-sports.io/fixtures?id=${matchId}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    
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
    
    console.log("✅ Data pertandingan ditemukan! Memulai AI Gemini...");
    const matchData = matchDataArray[0];
    const aiResult = await generatePrediction(matchData);
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