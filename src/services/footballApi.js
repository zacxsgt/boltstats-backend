const axios = require('axios');

// 1. Konfigurasi Utama API (Hanya ditulis sekali)
const footballApi = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    // Pastikan nama variabel env ini sama dengan yang ada di file .env kamu
    'x-apisports-key': process.env.API_KEY, 
    'x-rapidapi-host': 'v3.football.api-sports.io'
  }
});

// 2. --- FUNGSI BARU: Mengambil Statistik Pertandingan by ID ---
const getMatchStats = async (matchId) => {
  try {
    // Karena kita sudah pakai 'footballApi' di atas, kita tinggal panggil rute ujungnya saja
    const response = await footballApi.get(`/fixtures?id=${matchId}`);
    return response.data;
  } catch (error) {
    console.error("Gagal mengambil statistik dari API Sports:", error.message);
    throw error;
  }
};

// 3. Export yang BENAR agar bisa dibaca oleh server.js
module.exports = {
  footballApi,   // Mengekspor konfigurasi utama (jika masih dipakai di file lain)
  getMatchStats  // Mengekspor fungsi penarik statistik
};