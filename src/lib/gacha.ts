/** Gacha pool: each hero has an equal 1/3 (~33%) chance. */
export const GACHA_POOL = ["rogue", "warlock", "monk"] as const;
export type GachaHero = (typeof GACHA_POOL)[number];

/** r in [0,1) -> hero, uniform across the pool. */
export function rollGacha(r: number): GachaHero {
  const i = Math.min(GACHA_POOL.length - 1, Math.floor(r * GACHA_POOL.length));
  return GACHA_POOL[i]!;
}
