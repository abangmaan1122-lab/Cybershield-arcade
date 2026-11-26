# CyberShield: Packet Defender — HTML5 Canvas Mini Game

Mini game arkade 2D bertema keamanan jaringan berbasis **HTML5 Canvas, CSS3, dan Vanilla JavaScript** dengan arsitektur modular dan audio sintetis tanpa dependensi eksternal.

## Fitur Teknis Utama
* **60 FPS Delta-Time Game Loop:** Animasi dan kecepatan gerakan konsisten di berbagai *refresh rate* layar monitor.
* **Web Audio API Sound Synthesizer (`audio.js`):** Menghasilkan efek suara laser, notifikasi paket aman, ledakan musuh, dan *level-up* langsung dari osilator browser tanpa perlu file `.mp3`.
* **Persistent Leaderboard (`storage.js`):** Menyimpan 5 skor tertinggi operator beserta tingkat kesulitan dan *wave* tertinggi di `localStorage`.
* **Multi-Device Controls:** Mendukung *keyboard* (`Panah Kiri/Kanan`, `A/D`, `Spasi`, `P`) maupun tombol layar sentuh di perangkat *mobile*.

## Cara Menjalankan
Simpan seluruh file (`index.html`, `style.css`, `audio.js`, `storage.js`, `game.js`, `README.md`) dalam satu folder lalu buka `index.html` di browser modern.