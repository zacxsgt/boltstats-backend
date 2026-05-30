const axios = require('axios');

module.exports = async (req, res) => {
  const { leagueId, season } = req.query;
  
  try {
    const response = await axios.get('https://v3.football.api-sports.io/standings', {
      headers: { 'x-apisports-key': process.env.API_KEY },
      params: { league: leagueId, season: season }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil klasemen' });
  }
};