const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:leagueId/:season', async (req, res) => {
  const { leagueId, season } = req.params;
  console.log(`[STANDINGS ROUTE] Request liga ${leagueId} musim ${season}`);

  try {
    const response = await axios.get(`https://v3.football.api-sports.io/standings`, {
      headers: { 'x-apisports-key': process.env.API_KEY },
      params: { league: leagueId, season: season }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("ERROR API KLASEMEN:", error.message);
    res.status(500).json({ error: 'Gagal ambil klasemen' });
  }
});

module.exports = router;