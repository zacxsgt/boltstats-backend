const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// TAMBAHKAN LOG INI DI BAWAH:
router.use((req, res, next) => {
  console.log("DEBUG: Request masuk ke route Standings:", req.originalUrl);
  next();
});

router.get('/:leagueId/:season', async (req, res) => {
  const { leagueId, season } = req.params;
  console.log(`DEBUG: Mencoba fetch liga ${leagueId} musim ${season}`);
  
  const cacheKey = `standings_${leagueId}_${season}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`https://v3.football.api-sports.io/standings`, {
      headers: { 'x-apisports-key': process.env.API_KEY },
      params: { league: leagueId, season: season }
    });
    
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    console.error("ERROR API:", error.message);
    res.status(500).json({ error: 'Gagal ambil klasemen' });
  }
});

module.exports = router;