const express = require('express');
const router = express.Router();
const { footballApi, getMatchStats } = require('../services/footballApi');

router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[DEBUG] Mencoba mengambil jadwal untuk tanggal: ${today}`);

    const response = await footballApi.get('/fixtures', {
      params: { date: today }
    });

    console.log(`[DEBUG] API-Sports berhasil merespons! Jumlah data: ${response.data.results}`);

    res.json({
      status: 'success',
      results: response.data.results,
      data: response.data.response
    });
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

router.get('/:id', async (req, res) => {
  const matchId = req.params.id;
  try {
    console.log(`[DEBUG] Mengambil statistik untuk match: ${matchId}`);
    const statsData = await getMatchStats(matchId); 
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