const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // Cache 5 menit

router.get('/:leagueId', async (req, res) => {
  const { leagueId } = req.params;
  const cacheKey = `standings_${leagueId}`;

  // Cek Satpam
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=2025`, {
      headers: { 'x-apisports-key': process.env.API_KEY }
    });
    
    // Simpan ke Cache
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil klasemen' });
  }
});

module.exports = router;