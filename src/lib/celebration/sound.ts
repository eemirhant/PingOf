/**
 * Celebration SFX hook — silent by default.
 * Flip `enabled` (or wire a user preference later) to play sounds.
 */
export const celebrationSound = {
  /** Default: off. Set true when assets are ready. */
  enabled: false as boolean,

  playWin(): void {
    if (!this.enabled || typeof window === "undefined") return;
    void playTone(523.25, 0.12, 0.08);
  },

  playChampion(): void {
    if (!this.enabled || typeof window === "undefined") return;
    void playTone(523.25, 0.1, 0.07);
    window.setTimeout(() => void playTone(659.25, 0.12, 0.08), 110);
    window.setTimeout(() => void playTone(783.99, 0.18, 0.09), 230);
  },

  playComplete(): void {
    if (!this.enabled || typeof window === "undefined") return;
    void playTone(392, 0.1, 0.05);
  },
};

async function playTone(
  frequency: number,
  durationSec: number,
  gainValue: number,
): Promise<void> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.stop(ctx.currentTime + durationSec);
    window.setTimeout(() => void ctx.close(), (durationSec + 0.05) * 1000);
  } catch {
    /* ignore — sound is optional */
  }
}
