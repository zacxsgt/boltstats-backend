const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// Perhatikan di sini: kita tambah /:season
router.get('/:leagueId/:season', async (req, res) => {
  const { leagueId, season } = req.params; // Menangkap 140 dan 2024
  const cacheKey = `standings_${leagueId}_${season}`;

  // Cek Cache
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Kita gunakan variabel season di sini
    const response = await axios.get(`https://v3.football.api-sports.io/standings`, {
      headers: { 'x-apisports-key': process.env.API_KEY },
      params: { league: leagueId, season: season } // Dinamis!
    });
    
    // Simpan ke Cache
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error API:", error.message);
    res.status(500).json({ error: 'Gagal ambil klasemen' });
  }
});

module.exports = router;