/**
 * ============================================================================
 * CyberShield: Packet Defender — HTML5 Canvas 2D Game Engine (60 FPS)
 * Mengatur game loop, deteksi kolisi, spawning musuh/paket, & rendering visual.
 * ============================================================================
 */

class CyberShieldGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.WIDTH = this.canvas.width;   // 800
    this.HEIGHT = this.canvas.height; // 500

    this.state = 'START'; // START | PLAYING | PAUSED | GAMEOVER
    this.lastTimestamp = 0;
    this.gridOffset = 0;

    // Statistik sesi aktif
    this.score = 0;
    this.combo = 1;
    this.wave = 1;
    this.lives = 3;
    this.maxLives = 3;
    this.packetsSecured = 0;
    this.difficulty = 'normal';
    this.playerName = 'Player 1';

    // Entitas permainan
    this.player = {
      x: this.WIDTH / 2 - 36,
      y: this.HEIGHT - 54,
      width: 72,
      height: 22,
      speed: 460,
      fireCooldown: 0,
      dualLaserTimer: 0,
      hitFlashTimer: 0
    };

    this.bullets = [];
    this.fallingItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;

    // Status input
    this.keys = { left: false, right: false, fire: false };

    this.bindEvents();
    this.updateSoundButtonUI();
    this.renderLeaderboardTable();
    this.drawIdleBackground();
  }

  /* --------------------------------------------------------------------------
     1. PENGATURAN EVENT & KONTROL INPUT
     -------------------------------------------------------------------------- */
  bindEvents() {
    // Tombol Overlay Utama
    document.getElementById('btn-start-game').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-play-again').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-restart-pause').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-resume-game').addEventListener('click', () => this.togglePause());

    // Header Actions
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-sound').addEventListener('click', () => {
      SoundEngine.toggleMute();
      this.updateSoundButtonUI();
    });

    // Leaderboard Modal
    const modal = document.getElementById('leaderboard-modal');
    const openModal = () => {
      if (this.state === 'PLAYING') this.togglePause();
      this.renderLeaderboardTable();
      modal.classList.remove('hidden');
    };
    const closeModal = () => modal.classList.add('hidden');

    document.getElementById('btn-leaderboard').addEventListener('click', openModal);
    document.getElementById('btn-view-scores').addEventListener('click', openModal);
    document.getElementById('btn-close-leaderboard').addEventListener('click', closeModal);
    document.getElementById('btn-close-leaderboard-bottom').addEventListener('click', closeModal);
    document.getElementById('btn-reset-scores').addEventListener('click', () => {
      ScoreStorage.resetScores();
      this.renderLeaderboardTable();
    });

    // Kontrol Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
      if (e.code === 'Space') {
        if (this.state === 'PLAYING') e.preventDefault();
        this.keys.fire = true;
      }
      if ((e.code === 'KeyP' || e.code === 'Escape') && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
      if (e.code === 'Space') this.keys.fire = false;
    });

    // Kontrol Layar Sentuh (Mobile / Tablet)
    const bindHoldButton = (id, keyName) => {
      const btn = document.getElementById(id);
      const press = (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
      };
      const release = () => {
        this.keys[keyName] = false;
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    };

    bindHoldButton('btn-touch-left', 'left');
    bindHoldButton('btn-touch-right', 'right');
    bindHoldButton('btn-touch-fire', 'fire');
  }

  updateSoundButtonUI() {
    const muted = SoundEngine.isMuted();
    document.getElementById('sound-icon').textContent = muted ? '🔇' : '🔊';
    document.getElementById('sound-label').textContent = muted ? 'Mati' : 'Suara';
  }

  /* --------------------------------------------------------------------------
     2. SIKLUS HIDUP PERMAINAN (START, PAUSE, GAME OVER)
     -------------------------------------------------------------------------- */
  startNewGame() {
    this.playerName = document.getElementById('player-name-input').value.trim() || 'Player 1';
    this.difficulty = document.getElementById('difficulty-select').value;

    this.score = 0;
    this.combo = 1;
    this.wave = 1;
    this.lives = 3;
    this.packetsSecured = 0;

    this.player.x = this.WIDTH / 2 - this.player.width / 2;
    this.player.fireCooldown = 0;
    this.player.dualLaserTimer = 0;
    this.player.hitFlashTimer = 0;

    this.bullets = [];
    this.fallingItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0.4;

    document.getElementById('overlay-start').classList.add('hidden');
    document.getElementById('overlay-pause').classList.add('hidden');
    document.getElementById('overlay-gameover').classList.add('hidden');
    document.getElementById('btn-pause').disabled = false;

    this.state = 'PLAYING';
    this.updateHUD();
    SoundEngine.playWaveUp();

    this.lastTimestamp = performance.now();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('overlay-pause').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('overlay-pause').classList.add('hidden');
      this.lastTimestamp = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    document.getElementById('btn-pause').disabled = true;
    SoundEngine.playGameOver();

    const result = ScoreStorage.recordScore({
      playerName: this.playerName,
      difficulty: this.difficulty,
      wave: this.wave,
      score: this.score
    });

    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-packets').textContent = this.packetsSecured;

    const recordBadge = document.getElementById('new-record-badge');
    recordBadge.classList.toggle('hidden', !result.isNewRecord);

    document.getElementById('overlay-gameover').classList.remove('hidden');
    this.renderLeaderboardTable();
  }

  /* --------------------------------------------------------------------------
     3. GAME LOOP & PEMBARUAN LOGIKA (DELTA TIME)
     -------------------------------------------------------------------------- */
  loop(timestamp) {
    if (this.state !== 'PLAYING') return;

    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  update(dt) {
    this.gridOffset = (this.gridOffset + 45 * dt) % 40;

    // Gerakan Firewall Core Pemain
    if (this.keys.left) this.player.x -= this.player.speed * dt;
    if (this.keys.right) this.player.x += this.player.speed * dt;
    this.player.x = Math.max(12, Math.min(this.WIDTH - this.player.width - 12, this.player.x));

    // Cooldown Tembakan & Power-up
    if (this.player.fireCooldown > 0) this.player.fireCooldown -= dt;
    if (this.player.hitFlashTimer > 0) this.player.hitFlashTimer -= dt;
    if (this.player.dualLaserTimer > 0) {
      this.player.dualLaserTimer = Math.max(0, this.player.dualLaserTimer - dt);
      if (this.player.dualLaserTimer === 0) this.updateHUD();
    }

    if (this.keys.fire && this.player.fireCooldown <= 0) {
      this.fireBullet();
    }

    // Spawning Paket & Malware berdasarkan Wave
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEntity();
      const baseInterval = this.difficulty === 'hardcore' ? 0.78 : 1.05;
      this.spawnTimer = Math.max(0.32, baseInterval - (this.wave - 1) * 0.07);
    }

    // Pembaruan Peluru Laser
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= b.speed * dt;
      if (b.y + b.height < 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Pembaruan Objek Jatuh & Deteksi Kolisi
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i];
      item.y += item.vy * dt;
      if (item.vx) {
        item.x += item.vx * dt;
        if (item.x <= 16 || item.x + item.size >= this.WIDTH - 16) {
          item.vx *= -1;
        }
      }

      // Cek kolisi dengan peluru (hanya untuk musuh: malware & ransomware)
      let destroyedByBullet = false;
      if (item.type === 'malware' || item.type === 'ransomware') {
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const b = this.bullets[j];
          if (this.isRectOverlap(b.x, b.y, b.width, b.height, item.x, item.y, item.size, item.size)) {
            this.bullets.splice(j, 1);
            item.hp -= 1;

            if (item.hp <= 0) {
              const pts = item.type === 'ransomware' ? 60 : 25;
              this.addScore(pts);
              this.spawnParticles(item.x + item.size / 2, item.y + item.size / 2, item.color, 14);
              this.addFloatingText(`+${pts}`, item.x, item.y, item.color);
              SoundEngine.playDestroyEnemy();
              destroyedByBullet = true;
            } else {
              SoundEngine.playHitArmor();
              this.spawnParticles(b.x, b.y, '#e879f9', 6);
            }
            break;
          }
        }
      }

      if (destroyedByBullet) {
        this.fallingItems.splice(i, 1);
        continue;
      }

      // Cek kolisi dengan Firewall Core pemain
      if (
        this.isRectOverlap(
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
          item.x,
          item.y,
          item.size,
          item.size
        )
      ) {
        this.handlePlayerCatch(item);
        this.fallingItems.splice(i, 1);
        continue;
      }

      // Cek jika objek melewati batas bawah layar
      if (item.y > this.HEIGHT) {
        if (item.type === 'malware' || item.type === 'ransomware') {
          this.damageServer('Malware lolos ke server!');
        } else if (item.type === 'data') {
          this.combo = 1;
          this.updateHUD();
        }
        this.fallingItems.splice(i, 1);
      }
    }

    // Pembaruan Partikel & Floating Text
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 35 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  fireBullet() {
    this.player.fireCooldown = 0.2;
    SoundEngine.playShoot();

    if (this.player.dualLaserTimer > 0) {
      this.bullets.push(
        { x: this.player.x + 10, y: this.player.y - 12, width: 5, height: 14, speed: 640 },
        { x: this.player.x + this.player.width - 15, y: this.player.y - 12, width: 5, height: 14, speed: 640 }
      );
    } else {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 2.5,
        y: this.player.y - 12,
        width: 5,
        height: 14,
        speed: 620
      });
    }
  }

  spawnEntity() {
    const roll = Math.random();
    const speedMult = (this.difficulty === 'hardcore' ? 1.28 : 1.0) + (this.wave - 1) * 0.1;
    const margin = 36;
    const x = margin + Math.random() * (this.WIDTH - margin * 2 - 32);

    if (roll < 0.36) {
      // Data Paket Hijau (Tangkap)
      this.fallingItems.push({
        type: 'data',
        x,
        y: -30,
        size: 28,
        vy: 155 * speedMult,
        vx: 0,
        hp: 1,
        color: '#10b981'
      });
    } else if (roll < 0.78) {
      // Trojan Bug Merah (Tembak)
      this.fallingItems.push({
        type: 'malware',
        x,
        y: -32,
        size: 30,
        vy: 175 * speedMult,
        vx: 0,
        hp: 1,
        color: '#f43f5e'
      });
    } else if (roll < 0.92) {
      // Ransomware Berat Ungu (2 HP + Zig-zag)
      this.fallingItems.push({
        type: 'ransomware',
        x,
        y: -36,
        size: 34,
        vy: 130 * speedMult,
        vx: (Math.random() < 0.5 ? -1 : 1) * 85,
        hp: 2,
        color: '#a855f7'
      });
    } else {
      // Power-up Core Biru
      this.fallingItems.push({
        type: 'powerup',
        x,
        y: -28,
        size: 26,
        vy: 165 * speedMult,
        vx: 0,
        hp: 1,
        color: '#06b6d4'
      });
    }
  }

  handlePlayerCatch(item) {
    if (item.type === 'data') {
      const gained = 15 * this.combo;
      this.packetsSecured += 1;
      this.addScore(gained);
      this.combo = Math.min(5, this.combo + 1);
      SoundEngine.playCatchData();
      this.spawnParticles(item.x + 14, item.y + 14, '#10b981', 10);
      this.addFloatingText(`+${gained} (x${this.combo})`, item.x, item.y - 10, '#34d399');
      this.updateHUD();
    } else if (item.type === 'powerup') {
      SoundEngine.playPowerUp();
      this.spawnParticles(item.x + 13, item.y + 13, '#06b6d4', 14);
      if (this.lives < this.maxLives) {
        this.lives += 1;
        this.addFloatingText('+1 INTEGRITAS!', item.x - 15, item.y - 10, '#38bdf8');
      } else {
        this.player.dualLaserTimer = 8.0;
        this.addFloatingText('DUAL LASER 8s!', item.x - 15, item.y - 10, '#22d3ee');
      }
      this.updateHUD();
    } else {
      // Menabrak malware secara langsung
      this.spawnParticles(item.x + 15, item.y + 15, '#f43f5e', 16);
      this.damageServer('Firewall tertabrak malware!');
    }
  }

  damageServer(reasonText) {
    this.lives -= 1;
    this.combo = 1;
    this.player.hitFlashTimer = 0.35;
    SoundEngine.playDamage();
    this.addFloatingText(reasonText, this.player.x - 20, this.player.y - 24, '#fb7185');
    this.updateHUD();

    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  addScore(points) {
    this.score += points;
    const nextWave = Math.floor(this.score / 300) + 1;
    if (nextWave > this.wave) {
      this.wave = nextWave;
      SoundEngine.playWaveUp();
      this.addFloatingText(`WAVE ${this.wave}!`, this.WIDTH / 2 - 40, this.HEIGHT / 2, '#fbbf24');
    }
    this.updateHUD();
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = this.score;
    document.getElementById('hud-combo').textContent = `x${this.combo}`;
    document.getElementById('hud-wave').textContent = this.wave;
    document.getElementById('hud-powerup').textContent =
      this.player.dualLaserTimer > 0 ? `Dual (${Math.ceil(this.player.dualLaserTimer)}s)` : 'Normal';
    document.getElementById('hud-lives').textContent =
      '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, this.maxLives - this.lives));
  }

  /* --------------------------------------------------------------------------
     4. RENDERING VISUAL HTML5 CANVAS
     -------------------------------------------------------------------------- */
  drawIdleBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    this.drawCyberGrid();
  }

  drawCyberGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.HEIGHT);
      ctx.stroke();
    }

    for (let y = this.gridOffset; y <= this.HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.WIDTH, y);
      ctx.stroke();
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    this.drawCyberGrid();

    // Garis batas pertahanan server bawah
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.HEIGHT - 22);
    ctx.lineTo(this.WIDTH, this.HEIGHT - 22);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gambar Peluru Laser
    ctx.fillStyle = '#22d3ee';
    this.bullets.forEach((b) => {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // Gambar Objek Jatuh
    this.fallingItems.forEach((item) => {
      ctx.save();
      ctx.fillStyle = item.color;
      if (item.type === 'data') {
        // Paket Data Hijau (Kotak membulat + simbol +)
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.size, item.size, 6);
        ctx.fill();
        ctx.fillStyle = '#052e16';
        ctx.font = 'bold 16px JetBrains Mono';
        ctx.fillText('+', item.x + 9, item.y + 20);
      } else if (item.type === 'malware') {
        // Trojan Bug Merah (Segitiga terbalik / berlian tajam)
        ctx.beginPath();
        ctx.moveTo(item.x + item.size / 2, item.y + item.size);
        ctx.lineTo(item.x, item.y);
        ctx.lineTo(item.x + item.size, item.y);
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 'ransomware') {
        // Ransomware Ungu Berpelindung
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.size, item.size, 4);
        ctx.fill();
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 3, item.y + 3, item.size - 6, item.size - 6);
      } else {
        // Power-up Biru (Lingkaran bercahaya)
        ctx.beginPath();
        ctx.arc(item.x + item.size / 2, item.y + item.size / 2, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#083344';
        ctx.font = 'bold 13px JetBrains Mono';
        ctx.fillText('P', item.x + 9, item.y + 18);
      }
      ctx.restore();
    });

    // Gambar Firewall Core Pemain
    ctx.save();
    ctx.fillStyle = this.player.hitFlashTimer > 0 ? '#f43f5e' : '#10b981';
    ctx.beginPath();
    ctx.roundRect(this.player.x, this.player.y, this.player.width, this.player.height, 8);
    ctx.fill();

    // Turret meriam di atas core
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(this.player.x + this.player.width / 2 - 5, this.player.y - 6, 10, 8);
    ctx.restore();

    // Gambar Partikel Ledakan
    this.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    });

    // Gambar Floating Score Texts
    this.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 13px JetBrains Mono';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    });
  }

  /* --------------------------------------------------------------------------
     5. UTILITAS KOLISI, PARTIKEL, & LEADERBOARD UI
     -------------------------------------------------------------------------- */
  isRectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  spawnParticles(cx, cy, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.45
      });
    }
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({ text, x, y, color, life: 0.9 });
  }

  renderLeaderboardTable() {
    const scores = ScoreStorage.getTopScores();
    const tbody = document.getElementById('leaderboard-tbody');
    tbody.innerHTML = scores
      .map(
        (row, idx) => `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td>${row.playerName}</td>
          <td>${row.difficulty}</td>
          <td>Wave ${row.wave}</td>
          <td class="text-right text-emerald"><strong>${row.score}</strong></td>
        </tr>
      `
      )
      .join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cyberShieldApp = new CyberShieldGame();
});