/**
 * Audio system for Ludomercatus game
 * Uses Web Audio API to generate sound effects
 */

class AudioManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.3; // Default volume (0-1)

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.audioContext = null; // Will be created on first play
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Generate a beep sound
  private beep(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Dice roll sound
  playDiceRoll(): void {
    if (this.isMuted) return;
    // Short rattle sound
    this.beep(200, 0.1, 'square');
    setTimeout(() => this.beep(250, 0.1, 'square'), 50);
    setTimeout(() => this.beep(300, 0.08, 'square'), 100);
  }

  // Move/step sound
  playMove(): void {
    if (this.isMuted) return;
    this.beep(400, 0.15, 'sine');
  }

  // Purchase sound
  playPurchase(): void {
    if (this.isMuted) return;
    // Upward sweep
    this.beep(300, 0.2, 'sine');
    setTimeout(() => this.beep(500, 0.15, 'sine'), 100);
  }

  // Money/transaction sound
  playMoney(): void {
    if (this.isMuted) return;
    // Cash register sound
    this.beep(600, 0.1, 'square');
    setTimeout(() => this.beep(800, 0.1, 'square'), 50);
  }

  // Card draw sound
  playCardDraw(): void {
    if (this.isMuted) return;
    // Card flip sound
    this.beep(350, 0.2, 'sine');
    setTimeout(() => this.beep(450, 0.15, 'sine'), 100);
  }

  // Success/positive action
  playSuccess(): void {
    if (this.isMuted) return;
    // Pleasant chime
    this.beep(523.25, 0.15, 'sine'); // C
    setTimeout(() => this.beep(659.25, 0.15, 'sine'), 100); // E
    setTimeout(() => this.beep(783.99, 0.2, 'sine'), 200); // G
  }

  // Error/negative action
  playError(): void {
    if (this.isMuted) return;
    // Low buzz
    this.beep(150, 0.3, 'sawtooth');
  }

  // Auction bid sound
  playBid(): void {
    if (this.isMuted) return;
    this.beep(500, 0.1, 'square');
  }

  // Turn start notification
  playTurnStart(): void {
    if (this.isMuted) return;
    this.beep(440, 0.2, 'sine'); // A note
  }

  // Jail sound
  playJail(): void {
    if (this.isMuted) return;
    // Lock sound
    this.beep(200, 0.2, 'square');
    setTimeout(() => this.beep(150, 0.3, 'square'), 200);
  }

  // Building house/hotel
  playBuild(): void {
    if (this.isMuted) return;
    // Construction sound
    this.beep(400, 0.15, 'square');
    setTimeout(() => this.beep(500, 0.15, 'square'), 100);
    setTimeout(() => this.beep(600, 0.2, 'square'), 200);
  }

  // Bankruptcy/game over
  playGameOver(): void {
    if (this.isMuted) return;
    // Sad descending tones
    this.beep(400, 0.3, 'sine');
    setTimeout(() => this.beep(300, 0.3, 'sine'), 300);
    setTimeout(() => this.beep(200, 0.4, 'sine'), 600);
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

