import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GACHA_HEROES, IMG } from "@/lib/game";
import { getOwnedHeroes, pullGacha } from "@/lib/gacha.functions";

export const Route = createFileRoute("/gacha")({
  head: () => ({
    meta: [
      { title: "Invocação — Goblin Siege" },
      { name: "description", content: "Invoque Ladino, Bruxo ou Monge: 33% de chance para cada herói." },
      { property: "og:title", content: "Invocação — Goblin Siege" },
      { property: "og:description", content: "Banner com Ladino, Bruxo e Monge, 33% de chance cada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gacha,
});

function Gacha() {
  const pull = useServerFn(pullGacha);
  const fetchOwned = useServerFn(getOwnedHeroes);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [rolling, setRolling] = useState(false);
  const [spin, setSpin] = useState(0);
  const [result, setResult] = useState<{ hero: string; isNew: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      if (data.session) fetchOwned().then(setOwned).catch(() => {});
    });
  }, [fetchOwned]);

  useEffect(() => {
    if (!rolling) return;
    const t = setInterval(() => setSpin((s) => s + 1), 90);
    return () => clearInterval(t);
  }, [rolling]);

  const invoke = async () => {
    setError(""); setResult(null); setRolling(true);
    try {
      const [r] = await Promise.all([pull(), new Promise((ok) => setTimeout(ok, 1400))]);
      setResult(r);
      if (r.isNew) setOwned((o) => [...o, r.hero]);
    } catch {
      setError("Não foi possível invocar agora. Tente de novo.");
    }
    setRolling(false);
  };

  const shown = rolling ? GACHA_HEROES[spin % 3]! : GACHA_HEROES.find((h) => h.id === result?.hero);

  return (
    <main className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <Link to="/" className="px-3 py-1 rounded-md border bg-card text-sm">‹ Menu</Link>
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-primary mt-6 text-center">Invocação</h1>
      <p className="text-muted-foreground mt-2 mb-8">Ladino, Bruxo ou Monge — 33% de chance cada</p>

      <div className="w-full max-w-sm aspect-square rounded-2xl border-2 border-primary bg-card flex flex-col items-center justify-center p-6">
        {shown ? (
          <>
            <img src={IMG[shown.id]} alt={shown.name} className={`w-full flex-1 min-h-0 object-contain ${rolling ? "opacity-70 blur-[1px]" : ""}`} />
            <div className="font-display text-3xl mt-2">{shown.name}</div>
            {!rolling && result && (
              <div className={`text-sm ${result.isNew ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {result.isNew ? "✨ Novo herói! Já pode usar na sua equipe." : "Você já tinha esse herói."}
              </div>
            )}
          </>
        ) : (
          <div className="font-display text-6xl text-primary">?</div>
        )}
      </div>

      {signedIn === false ? (
        <Link to="/" className="mt-6 py-3 px-8 rounded-md bg-primary text-primary-foreground font-display text-lg">Entre na conta para invocar</Link>
      ) : (
        <button onClick={invoke} disabled={rolling || !signedIn}
          className="mt-6 py-3 px-10 rounded-md bg-primary text-primary-foreground font-display text-xl disabled:opacity-60">
          {rolling ? "Invocando..." : "Invocar"}
        </button>
      )}
      {error && <p className="text-destructive text-sm mt-3">{error}</p>}

      <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-md">
        {GACHA_HEROES.map((h) => {
          const has = owned.includes(h.id);
          return (
            <div key={h.id} className={`rounded-xl p-3 text-center ${has ? "bg-card border-2 border-primary" : "bg-secondary opacity-60"}`}>
              <img src={IMG[h.id]} alt={h.name} loading="lazy" className={`w-full aspect-square object-cover object-top rounded-lg ${has ? "" : "grayscale"}`} />
              <div className="font-display mt-1">{h.name}</div>
              <div className="text-xs text-muted-foreground">33% · {has ? "Obtido" : "Bloqueado"}</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
