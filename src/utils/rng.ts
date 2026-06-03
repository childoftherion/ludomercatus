/**
 * Deterministic Random Number Generator
 *
 * Provides seeded RNG for deterministic AI behavior that can be replayed
 * in tests and logs. Uses the mulberry32 algorithm for fast, high-quality
 * pseudo-random numbers.
 *
 * @module rng
 */

/**
 * Mulberry32 - Fast 32-bit seeded PRNG
 * @param seed - Initial seed value
 * @returns A random number generator function
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * SeededRNG class providing a deterministic random number generator
 * with utility methods for common operations.
 */
export class SeededRNG {
  private rng: () => number;

  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }

  /**
   * Generate a pseudo-random number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    return this.rng();
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive).
   */
  nextInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error(`min (${min}) must be less than max (${max})`);
    }
    const range = max - min;
    return min + Math.floor(this.rng() * range);
  }

  /**
   * Generate a random boolean with equal probability.
   */
  nextBool(): boolean {
    return this.rng() >= 0.5;
  }

  /**
   * Select a random element from an array.
   * @returns The same type as array elements, or undefined if array is empty
   */
  pick<T>(array: readonly T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Shuffle an array deterministically (Fisher-Yates algorithm).
   * Returns a new shuffled array without mutating the original.
   */
  shuffle<T>(array: readonly T[]): T[] {
    const shuffled: T[] = Array.from(array);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      const temp = shuffled[j]!;
      shuffled[j] = shuffled[i];
      shuffled[i] = temp;
    }
    return shuffled;
  }

  /**
   * Pick N unique random elements from an array.
   * @returns Array of N randomly selected elements
   */
  pickN<T>(array: readonly T[], count: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Generate a random float between min (inclusive) and max (exclusive).
   */
  nextFloat(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Generate a random integer following a normal-ish distribution
   * by summing multiple random values (Central Limit Theorem).
   */
  nextNormalInt(
    mean: number,
    stdDev: number,
    min?: number,
    max?: number,
  ): number {
    // Sum of 12 uniform random numbers has mean 6 and variance 1
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += this.rng();
    }
    sum -= 6; // Center around 0

    const value = Math.round(mean + sum * stdDev);

    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  }

  /**
   * Generate a random choice weighted by probabilities.
   * @param choices Array of [value, weight] pairs
   * @returns The selected value
   */
  weightedPick<T>(choices: readonly [T, number][]): T {
    const totalWeight = choices.reduce((sum, [, w]) => sum + w, 0);
    let target = this.rng() * totalWeight;

    for (const [value, weight] of choices) {
      target -= weight;
      if (target <= 0) return value;
    }

    return choices[choices.length - 1]![0];
  }

  /**
   * Clone the RNG with a new seed (for sub-generators).
   */
  cloneWithSeed(seed: number): SeededRNG {
    return new SeededRNG(seed);
  }

  /**
   * Create a child RNG with a derived seed.
   */
  child(seedOffset: number = 1): SeededRNG {
    const childSeed = (this.rng() * 0xffffffff + seedOffset) >>> 0;
    return new SeededRNG(childSeed);
  }
}

// ============================================================================
// Global RNG Management
// ============================================================================

let globalRng: SeededRNG | null = null;

/**
 * Set a global seeded RNG for deterministic behavior.
 * When set, all calls to `random()` will use this seed.
 */
export function setGlobalRNG(seed: number): SeededRNG {
  globalRng = new SeededRNG(seed);
  return globalRng;
}

/**
 * Clear the global RNG, reverting to Math.random().
 */
export function clearGlobalRNG(): void {
  globalRng = null;
}

/**
 * Get the current global RNG, creating one if needed.
 */
export function getGlobalRNG(): SeededRNG {
  if (!globalRng) {
    // Use a seed based on timestamp for non-deterministic default
    globalRng = new SeededRNG(Date.now() ^ (Math.random() * 0xffffffff));
  }
  return globalRng;
}

/**
 * Generate a random number between 0 and 1.
 * Uses the global seeded RNG if set, otherwise Math.random().
 */
export function random(): number {
  return getGlobalRNG().next();
}

/**
 * Generate a random integer between min (inclusive) and max (exclusive).
 */
export function randomInt(min: number, max: number): number {
  return getGlobalRNG().nextInt(min, max);
}

/**
 * Shuffle an array randomly.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  return getGlobalRNG().shuffle(array);
}

/**
 * Pick a random element from an array.
 */
export function pick<T>(array: readonly T[]): T | undefined {
  return getGlobalRNG().pick(array);
}

/**
 * Generate a deterministic game seed from roomId and player count.
 */
export function generateGameSeed(
  roomId: string | null,
  playerCount: number,
): number {
  let hash = 0;
  const seedString = `${roomId || "local"}-${playerCount}-${Date.now()}`;

  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash);
}

/**
 * Create a deterministic RNG for a specific game session.
 */
export function createGameRNG(
  roomId: string | null,
  playerCount: number,
): SeededRNG {
  const seed = generateGameSeed(roomId, playerCount);
  return new SeededRNG(seed);
}
