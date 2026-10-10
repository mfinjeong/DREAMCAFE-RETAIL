/**
 * Progressive level formula for DREAMCAFE retail gaming progression.
 * 
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP
 * Level 5: 700 XP
 * Level L (L >= 2): 25 * (L - 1) * (L + 2)
 * 
 * This is the single source of truth for level calculations.
 * Used by gaming-profile.service, member.service, and verification scripts.
 */

/**
 * Calculates member level from total XP based on progressive threshold formula.
 */
export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  // Solving 25 * (L^2 + L - 2) <= xp:
  const val = 1 + 4 * (2 + xp / 25);
  const level = Math.floor((-1 + Math.sqrt(val)) / 2);
  return Math.max(1, level);
}

/**
 * Total XP required to reach the given level.
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

/**
 * Total XP required to reach the next level (level + 1).
 */
export function calculateXPForNextLevel(level: number): number {
  return calculateXPForLevel(level + 1);
}