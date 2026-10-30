import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HEROES, STAGES, act, spawn, type Unit } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goblin Siege — RPG de Turnos" },
      { name: "description", content: "Cavaleiro, Mago e Arqueira contra hordas goblin e o Hobgoblin em batalhas automáticas por turno." },
      { property: "og:title", content: "Goblin Siege — RPG de Turnos" },
      { property: "og:description", content: "Batalhas automáticas por turno contra goblins e o boss Hobgoblin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Game,
});

function Game() {
  const [stage, setStage] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [speed, setSpeed] = useState(700);
  const [active, setActive] = useState<string | null>(null);
  const order = useRef<Unit[]>([]);
  const pos = useRef(0);

  const start = (i: number) => {
    const mult = 1 + i * 0.15;
    const u = [...HEROES.map((h) => spawn(h, "hero")), ...STAGES[i]!.enemies.map((e) => spawn(e, "enemy", mult))];
    order.current = [...u].sort((a, b) => b.spd - a.spd);
    pos.current = 0;
    setUnits(u); setLog([`⚔️ ${STAGES[i]!.name} começou!`]); setResult(null); setStage(i);
  };

  useEffect(() => {
    if (stage === null || result) return;
    const t = setTimeout(() => {
      const alive = order.current.filter((u) => u.hp > 0);
      let actor = order.current[pos.current % order.current.length]!;
      while (actor.hp <= 0) { pos.current++; actor = order.current[pos.current % order.current.length]!; }
      pos.current++;
      setActive(actor.uid);
      const msg = act(actor, alive);
      const heroes = alive.filter((u) => u.side === "hero" && u.hp > 0).length;
      const foes = alive.filter((u) => u.side === "enemy" && u.hp > 0).length;
      setLog((l) => [msg, ...l].slice(0, 40));
      setUnits((u) => [...u]);
      if (!foes) setResult("win"); else if (!heroes) setResult("lose");
    }, speed);
    return () => clearTimeout(t);
  }, [units, stage, result, speed]);

  if (stage === null) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center">
        <h1 className="font-display text-5xl md:text-6xl text-primary mt-10 text-center">Goblin Siege</h1>
        <p className="text-muted-foreground mt-3 mb-10">Escolha a fase. Seus heróis lutam sozinhos.</p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl w-full">
          {STAGES.map((s, i) => (
            <button key={i} onClick={() => start(i)}
              className={`text-left rounded-xl border-2 p-6 bg-card hover:border-primary transition hover:-translate-y-1 ${i === 3 ? "border-destructive" : "border-border"}`}>
              <div className="font-display text-2xl">{s.name}</div>
              <div className="text-muted-foreground text-sm mb-3">{s.desc}</div>
              <div className="text-2xl">{s.enemies.map((e) => e.emoji).join(" ")}</div>
            </button>
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-3xl w-full">
          {HEROES.map((h) => (
            <div key={h.id} className="rounded-xl bg-secondary p-4">
              <div className="text-3xl">{h.emoji}</div>
              <div className="font-display text-xl">{h.name}</div>
              {h.skills.map((s) => (
                <div key={s.name} className={`text-sm ${s.ultimate ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {s.ultimate ? "⚡ " : "• "}{s.name} {s.cooldown ? `(CD ${s.cooldown})` : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    );
  }

  const side = (s: "hero" | "enemy") => units.filter((u) => u.side === s);
  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto mb-6">
        <h2 className="font-display text-3xl text-primary">{STAGES[stage]!.name}</h2>
        <div className="flex gap-2">
          {[["1x", 900], ["2x", 450], ["4x", 180]].map(([l, v]) => (
            <button key={l} onClick={() => setSpeed(v as number)}
              className={`px-3 py-1 rounded-md border ${speed === v ? "bg-primary text-primary-foreground" : "bg-card"}`}>{l}</button>
          ))}
          <button onClick={() => setStage(null)} className="px-3 py-1 rounded-md border bg-card">Fases</button>
        </div>
      </div>
      <div className="grid md:grid-cols-[1fr_1fr] gap-6 max-w-6xl mx-auto">
        {(["hero", "enemy"] as const).map((s) => (
          <div key={s} className="space-y-3">
            <h3 className="font-display text-xl text-muted-foreground">{s === "hero" ? "Heróis" : "Inimigos"}</h3>
            {side(s).map((u) => <UnitCard key={u.uid} u={u} active={active === u.uid} />)}
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto mt-6 rounded-xl bg-card border p-4 h-56 overflow-y-auto text-sm space-y-1">
        {log.map((l, i) => <div key={i} className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{l}</div>)}
      </div>
      {result && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-card border-2 border-primary rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="font-display text-4xl mb-4">{result === "win" ? "🏆 Vitória!" : "💀 Derrota"}</div>
            <div className="flex flex-col gap-2">
              {result === "win" && stage < 3 && (
                <button onClick={() => start(stage + 1)} className="py-2 rounded-md bg-primary text-primary-foreground">Próxima fase</button>
              )}
              <button onClick={() => start(stage)} className="py-2 rounded-md border">Jogar de novo</button>
              <button onClick={() => setStage(null)} className="py-2 rounded-md border">Escolher fase</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function UnitCard({ u, active }: { u: Unit; active: boolean }) {
  const dead = u.hp <= 0;
  const pct = (u.hp / u.maxHp) * 100;
  return (
    <div className={`rounded-xl border-2 bg-card p-3 flex gap-3 items-center transition ${active ? "border-primary scale-[1.02]" : "border-border"} ${dead ? "opacity-30 grayscale" : ""}`}>
      <div className={`text-4xl ${u.id === "boss" ? "text-6xl" : ""}`}>{u.emoji}</div>
      <div className="flex-1">
        <div className="flex justify-between text-sm font-semibold">
          <span>{u.name}</span>
          <span>{u.hp}/{u.maxHp}{u.shield > 0 && <span className="text-accent-foreground"> +🛡{u.shield}</span>}</span>
        </div>
        <div className="h-2 rounded bg-muted mt-1 overflow-hidden">
          <div className={`h-full transition-all ${u.side === "hero" ? "bg-hp-hero" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-1 mt-2">
          {u.skills.map((s, i) => (
            <span key={s.name} title={s.name}
              className={`text-[10px] px-1.5 py-0.5 rounded ${u.cds[i]! > 0 ? "bg-muted text-muted-foreground" : s.ultimate ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {s.ultimate ? "⚡" : ""}{s.name}{u.cds[i]! > 0 ? ` ${u.cds[i]}` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
