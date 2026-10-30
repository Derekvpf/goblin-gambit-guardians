import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GACHA_POOL, rollGacha } from "./gacha";

export const getOwnedHeroes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("owned_heroes").select("hero_id").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.hero_id);
  });

export const pullGacha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const hero = rollGacha(Math.random());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("owned_heroes").select("hero_id")
      .eq("user_id", context.userId).eq("hero_id", hero).maybeSingle();
    if (!existing) {
      const { error } = await supabaseAdmin.from("owned_heroes").insert({ user_id: context.userId, hero_id: hero });
      if (error) throw new Error(error.message);
    }
    return { hero, isNew: !existing, pool: GACHA_POOL };
  });
