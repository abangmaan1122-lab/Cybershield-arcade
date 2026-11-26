/**
 * ============================================================================
 * CyberShield: Packet Defender — LocalStorage Leaderboard Manager
 * Menyimpan dan mengurutkan Top 5 skor tertinggi pemain secara persisten.
 * ============================================================================
 */

const ScoreStorage = (() => {
  const STORAGE_KEY = 'cybershield_leaderboard_v1';

  const DEFAULT_SCORES = [
    { id: 'SEED-1', playerName: 'SysAdmin_Pro', difficulty: 'Hardcore', wave: 5, score: 1250 },
    { id: 'SEED-2', playerName: 'NetGuard_ID', difficulty: 'Normal', wave: 4, score: 890 },
    { id: 'SEED-3', playerName: 'PacketHunter', difficulty: 'Normal', wave: 3, score: 540 }
  ];

  function sanitizeName(raw) {
    const cleaned = String(raw || 'Player 1')
      .replace(/[<>&"'/]/g, '')
      .trim()
      .slice(0, 18);
    return cleaned || 'Player 1';
  }

  function loadAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
      return [...DEFAULT_SCORES];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...DEFAULT_SCORES];
    } catch {
      return [...DEFAULT_SCORES];
    }
  }

  return {
    getTopScores() {
      return loadAll()
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },

    recordScore({ playerName, difficulty, wave, score }) {
      const currentTop = this.getTopScores();
      const previousBest = currentTop.length > 0 ? currentTop[0].score : 0;

      const entry = {
        id: `SCR-${Date.now()}`,
        playerName: sanitizeName(playerName),
        difficulty: difficulty === 'hardcore' ? 'Hardcore' : 'Normal',
        wave: Number(wave) || 1,
        score: Number(score) || 0
      };

      const updated = [...currentTop, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      return {
        isNewRecord: entry.score > 0 && entry.score > previousBest,
        topScores: updated
      };
    },

    resetScores() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
      return this.getTopScores();
    }
  };
})();