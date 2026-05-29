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
    
    const matchDataArray = response.data.response;
    if (!matchDataArray || matchDataArray.length === 0) {
      return res.status(404).json({ error: "Pertandingan tidak ditemukan" });
    }
    
    const matchData = matchDataArray[0];
    const aiResult = await generatePrediction(matchData);
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