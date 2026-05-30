const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generatePrediction = async (matchData, extraData = {}) => {
  try {
    // === MENGGUNAKAN MODEL ASLI ANDA YANG TERBUKTI LANCAR ===
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Pengecekan aman agar tidak crash jika data API terputus
    if (!matchData || !matchData.teams) {
      throw new Error("Data pertandingan kosong"); 
    }

    const homeTeam = matchData.teams.home.name;
    const awayTeam = matchData.teams.away.name;
    const league = matchData.league.name;

    const seasonYear = matchData.league.season || new Date().getFullYear();
    const dynamicSeason = `${seasonYear}-${seasonYear + 1}`;

    const homeForm = extraData.homeForm || 'Data belum ditarik';
    const awayForm = extraData.awayForm || 'Data belum ditarik';
    const homeAvgGoals = extraData.homeAvgGoals || 'N/A';
    const awayAvgGoals = extraData.awayAvgGoals || 'N/A';

    // === MERANGKUM DATA API KE DALAM TEKS UNTUK DIBACA AI ===
    const h2hSummary = (extraData.h2hData && extraData.h2hData.length > 0)
      ? extraData.h2hData.map(m => `${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`).join(', ')
      : "Tidak ada data riwayat H2H";

    const injuriesSummary = (extraData.injuriesData && extraData.injuriesData.length > 0)
      ? extraData.injuriesData.map(i => `${i.player.name} (${i.team.name} - ${i.type || i.reason || 'Cedera'})`).join(', ')
      : "Tidak ada pemain cedera dilaporkan";

    // === PROMPT ASLI ANDA (DENGAN TAMBAHAN FAKTA LAPANGAN) ===
    const prompt = `
Anda adalah analis sepak bola elite dengan spesialisasi dalam statistik mendalam, taktik, dan prediksi pertandingan. Sebelum memberikan prediksi, Anda WAJIB melakukan riset mendalam secara bertahap seperti di bawah ini.

=== DATA PERTANDINGAN ===
Liga: ${league}
Musim: ${dynamicSeason}
Pertandingan: ${homeTeam} (Tuan Rumah) vs ${awayTeam} (Tamu)

=== DATA AWAL (BANTU KONTEKS) ===
Form 5 Laga Terakhir ${homeTeam}: ${homeForm}
Form 5 Laga Terakhir ${awayTeam}: ${awayForm}
Rata-rata gol per laga ${homeTeam}: ${homeAvgGoals}
Rata-rata gol per laga ${awayTeam}: ${awayAvgGoals}

=== FAKTA LAPANGAN (DATA REAL-TIME WAJIB BACA) ===
Riwayat Head-to-Head Terakhir: ${h2hSummary}
Daftar Pemain Cedera/Absen Hari Ini: ${injuriesSummary}

=== FASE RISET WAJIB (LAKUKAN SEBELUM PREDIKSI) ===
1. RISET SKUAD & KONDISI TERKINI (MUSIM ${dynamicSeason}): Pelajari starting XI, cedera di atas, pemain kunci, dan transfer.
2. RISET PERFORMA MUSIM INI (${dynamicSeason}): Analisis posisi liga, statistik gol, performa kandang/tandang, dan tren 10 laga terakhir.
3. RISET HISTORIS (3 MUSIM TERAKHIR): Analisis head-to-head yang diberikan, pola skor, dan dominasi tim.
4. RISET PELATIH: Filosofi taktik pelatih kedua tim dan head-to-head pelatih.
5. FAKTOR KONTEKSTUAL: Kompetisi lain, rotasi, motivasi tim, dan faktor eksternal.

=== INSTRUKSI BERPIKIR MENDALAM ===
Setelah riset, timbang faktor kemenangan masing-masing tim dan identifikasi pembeda krusial sebelum memutuskan prediksi.

PENTING: Berikan respons HANYA dalam format JSON valid berikut. JANGAN tambahkan teks pengantar, JANGAN gunakan markdown block. Langsung mulai dengan "{" dan akhiri dengan "}".

{
  "riset_summary": {
    "kondisi_home": {
      "skuad_inti": "Pemain kunci ${homeTeam} musim ${dynamicSeason}",
      "absen_cedera": "Pemain absen ${homeTeam}",
      "performa_musim_ini": "Ringkasan performa ${homeTeam}",
      "pelatih": "Pelatih dan taktik"
    },
    "kondisi_away": {
      "skuad_inti": "Pemain kunci ${awayTeam} musim ${dynamicSeason}",
      "absen_cedera": "Pemain absen ${awayTeam}",
      "performa_musim_ini": "Ringkasan performa ${awayTeam}",
      "pelatih": "Pelatih dan taktik"
    },
    "head_to_head": "Pola H2H 3 musim terakhir",
    "faktor_kontekstual": "Motivasi dan faktor lain"
  },
  "tinjauan_singkat": {
    "home": "Analisis ${homeTeam}",
    "away": "Analisis ${awayTeam}",
    "head_to_head": "Ringkasan H2H"
  },
  "analisis_taktik": {
    "formasi_home": "Prediksi formasi ${homeTeam} (Misal: 3-2-4-1)",
    "formasi_away": "Prediksi formasi ${awayTeam} (Misal: 4-3-3)",
    "skema_permainan": "Penjelasan detail skema, taktik pelatih, dan alur serangan",
    "kunci_pertandingan": "Faktor taktis dan non-taktis utama penentu hasil laga ini"
  },
  "grafik_probabilitas": {
    "home_persen": 48,
    "draw_persen": 22,
    "away_persen": 30
  },
  "grafik_intensitas": [30, 45, 80, 50, 60, 40, 70, 90, 85, 60],
  "prediksi_skor": {
    "skor_akhir": "X-X",
    "skor_babak_pertama": "X-X",
    "pencetak_gol_pertama": "Nama pemain",
    "pemenang_babak_pertama": "${homeTeam} / ${awayTeam} / Draw",
    "tingkat_keyakinan": "Tinggi / Sedang / Rendah",
    "alasan_skor": "Logika skor akhir"
  },
  "prediksi_corner": {
    "total_corner": "10.5+",
    "corner_home": 0,
    "corner_away": 0,
    "rekomendasi_corner": "Over/Under X.5",
    "alasan": "Tren corner"
  },
  "prediksi_btts": {
    "kedua_tim_cetak_gol": "YES / NO",
    "alasan": "Analisis BTTS"
  },
  "rekomendasi_pasar": {
    "handicap": { "saran": "...", "alasan": "..." },
    "over_under_gol": { "saran": "...", "alasan": "..." },
    "over_under_corner": { "saran": "...", "alasan": "..." },
    "btts": { "saran": "...", "alasan": "..." },
    "pencetak_gol_pertama": { "saran": "...", "alasan": "..." },
    "pemenang_babak_pertama": { "saran": "...", "alasan": "..." }
  },
  "kesimpulan": {
    "ringkasan": "Narasi 3-4 kalimat ringkasan akhir.",
    "pick_terbaik": "Tuliskan saran rekomendasi taruhan paling confident secara lengkap tanpa terpotong",
    "tingkat_risiko": "Rendah / Sedang / Tinggi (sertakan persentasenya, misal: Sedang (65%))"
  },
  "info_tambahan_ui": {
    "daftar_cedera": {
      "home": "Nama pemain kunci yang absen/cedera (Tuan Rumah) beserta alasannya. Tulis 'Aman' jika tidak ada.",
      "away": "Nama pemain kunci yang absen/cedera (Tamu) beserta alasannya. Tulis 'Aman' jika tidak ada."
    },
    "top_skor_tim": {
      "home": "Nama top skor tuan rumah musim ini (Misal: E. Haaland - 14 Gol)",
      "away": "Nama top skor tamu musim ini (Misal: M. Salah - 11 Gol)"
    },
    "line_up_visual": {
      "formasi_home": "Hanya angka formasi (Misal: 4-3-3)",
      "formasi_away": "Hanya angka formasi (Misal: 4-2-3-1)"
    }
  }
}
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();

    // === INI SATU-SATUNYA SOLUSI YANG SEBENARNYA DIBUTUHKAN ===
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      textResponse = textResponse.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(textResponse);

  } catch (error) {
    console.error('--- ERROR PREDIKSI AI ---', error.message);
    
    // Fallback sederhana sebagai ganti Error 500 (Sudah ditambahkan info_tambahan_ui)
    return {
      riset_summary: { kondisi_home: { skuad_inti: "N/A", absen_cedera: "N/A", performa_musim_ini: "Data minim", pelatih: "N/A" }, kondisi_away: { skuad_inti: "N/A", absen_cedera: "N/A", performa_musim_ini: "Data minim", pelatih: "N/A" }, head_to_head: "N/A", faktor_kontekstual: "N/A" },
      tinjauan_singkat: { home: "N/A", away: "N/A", head_to_head: "N/A" },
      analisis_taktik: { formasi_home: "?", formasi_away: "?", skema_permainan: "Gagal memuat prediksi AI", kunci_pertandingan: "N/A" },
      grafik_probabilitas: { home_persen: 33, draw_persen: 34, away_persen: 33 },
      grafik_intensitas: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      prediksi_skor: { skor_akhir: "?-?", skor_babak_pertama: "?-?", pencetak_gol_pertama: "N/A", pemenang_babak_pertama: "Draw", tingkat_keyakinan: "Rendah", alasan_skor: "N/A" },
      prediksi_corner: { total_corner: "?", corner_home: 0, corner_away: 0, rekomendasi_corner: "N/A", alasan: "N/A" },
      prediksi_btts: { kedua_tim_cetak_gol: "N/A", alasan: "N/A" },
      rekomendasi_pasar: { handicap: { saran: "N/A" }, over_under_gol: { saran: "N/A" }, over_under_corner: { saran: "N/A" }, btts: { saran: "N/A" }, pencetak_gol_pertama: { saran: "N/A" }, pemenang_babak_pertama: { saran: "N/A" } },
      kesimpulan: { ringkasan: "Sistem gagal menarik data analisis dari AI.", pick_terbaik: "N/A", tingkat_risiko: "Tinggi" },
      info_tambahan_ui: {
        daftar_cedera: { home: "N/A", away: "N/A" },
        top_skor_tim: { home: "N/A", away: "N/A" },
        line_up_visual: { formasi_home: "?", formasi_away: "?" }
      }
    };
  }
};

module.exports = { generatePrediction };