import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IMG, PIX, HEROES, STAGES, act, spawn, type Unit } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goblin Siege — RPG de Turnos" },
      { name: "description", content: "Cavaleiro, Mago e Arqueira contra hordas goblin e o boss Hobgoblin em batalhas automáticas por turno." },
      { property: "og:title", content: "Goblin Siege — RPG de Turnos" },
      { property: "og:description", content: "Batalhas automáticas por turno contra goblins e o boss Hobgoblin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Game,
});

/* ---------------- animation helpers ---------------- */
type KF = Record<string, string | number>[];
type Refs = React.MutableRefObject<Record<string, HTMLDivElement | null>>;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const token = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function run(el: HTMLElement | null | undefined, kf: KF, duration: number, iterations = 1) {
  if (!el || reduced()) return;
  el.animate(kf as Keyframe[], { duration, easing: "ease-out", iterations });
}

/** Floating combat text over a sprite (-24, +45, 🛡40). */
function popup(host: HTMLElement | null | undefined, target: HTMLElement | null | undefined, text: string, color: string) {
  if (!host || !target || reduced()) return;
  const h = host.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const s = document.createElement("span");
  s.textContent = text;
  s.style.cssText =
    "position:absolute;z-index:10;pointer-events:none;white-space:nowrap;" +
    `left:${r.left - h.left + r.width / 2}px;top:${r.top - h.top}px;` +
    `color:${color};font:700 15px/1 var(--font-display), Georgia, serif;` +
    "text-shadow:0 2px 0 var(--background);";
  host.appendChild(s);
  s.animate(
    [
      { transform: "translate(-50%,0) scale(.7)", opacity: 0 },
      { transform: "translate(-50%,-18px) scale(1.2)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%,-48px) scale(1)", opacity: 0 },
    ],
    { duration: 900, easing: "ease-out" },
  ).onfinish = () => s.remove();
}

/** What the acting hero/enemy does: lunge, supreme slam, brace or heal-cast. */
function playActor(el: HTMLElement | null | undefined, dir: number, kind: string, ult: boolean, gold: string, green: string) {
  if (!el) return;
  if (ult) {
    run(el, [
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
      { transform: "translate(0,-26px) scale(1.08)", filter: `brightness(2) drop-shadow(0 0 14px ${gold})`, offset: 0.4 },
      { transform: `translate(${20 * dir}px,8px) scale(1.14) rotate(${5 * dir}deg)`, filter: `brightness(3) drop-shadow(0 0 26px ${gold})`, offset: 0.62 },
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
    ], 700);
    return;
  }
  if (kind === "shield") {
    run(el, [
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
      { transform: "translate(0,6px) scale(1.14,0.86)", filter: `brightness(1.5) drop-shadow(0 0 16px ${gold})`, offset: 0.45 },
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
    ], 560);
  } else if (kind === "heal") {
    run(el, [
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
      { transform: "translate(0,-16px) scale(1.06)", filter: `brightness(1.6) drop-shadow(0 0 16px ${green})`, offset: 0.5 },
      { transform: "translate(0,0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
    ], 620);
  } else {
    run(el, [
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: `translate(${-12 * dir}px,-3px) rotate(${-5 * dir}deg)`, offset: 0.3 },
      { transform: `translate(${38 * dir}px,-8px) rotate(${8 * dir}deg)`, offset: 0.55 },
      { transform: `translate(${12 * dir}px,0) rotate(0deg)` },
      { transform: "translate(0,0) rotate(0deg)" },
    ], 430);
  }
}

const playHurt = (el: HTMLElement | null | undefined) =>
  run(el, [
    { transform: "translateX(0)", filter: "brightness(2.8) saturate(.2)" },
    { transform: "translateX(-8px)", filter: "brightness(1.9) saturate(.6)" },
    { transform: "translateX(7px)", filter: "brightness(1.4) saturate(.85)" },
    { transform: "translateX(-4px)", filter: "brightness(1.1) saturate(1)" },
    { transform: "translateX(0)", filter: "brightness(1) saturate(1)" },
  ], 360);

const playGuard = (el: HTMLElement | null | undefined, gold: string) =>
  run(el, [
    { transform: "translateY(0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
    { transform: "translateY(-6px) scale(1.06)", filter: `brightness(1.45) drop-shadow(0 0 14px ${gold})`, offset: 0.4 },
    { transform: "translateY(0) scale(1)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
  ], 620);

const playHealed = (el: HTMLElement | null | undefined, green: string) =>
  run(el, [
    { transform: "translateY(0)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
    { transform: "translateY(-12px)", filter: `brightness(1.7) drop-shadow(0 0 16px ${green})`, offset: 0.45 },
    { transform: "translateY(0)", filter: "brightness(1) drop-shadow(0 0 0px transparent)" },
  ], 640);

const shakeArena = (el: HTMLElement | null | undefined) =>
  run(el, [
    { transform: "translate(0,0)" },
    { transform: "translate(-7px,4px)" },
    { transform: "translate(6px,-5px)" },
    { transform: "translate(-4px,2px)" },
    { transform: "translate(0,0)" },
  ], 400);

/* ---------------- screens ---------------- */
function Game() {
  const [stage, setStage] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [speed, setSpeed] = useState(700);
  const [active, setActive] = useState<string | null>(null);
  const order = useRef<Unit[]>([]);
  const pos = useRef(0);
  const sprites = useRef<Record<string, HTMLDivElement | null>>({});
  const arena = useRef<HTMLDivElement | null>(null);

  const start = (i: number) => {
    const mult = 1 + i * 0.15;
    const u = [...HEROES.map((h) => spawn(h, "hero")), ...STAGES[i]!.enemies.map((e) => spawn(e, "enemy", mult))];
    order.current = [...u].sort((a, b) => b.spd - a.spd);
    pos.current = 0;
    setUnits(u); setLog([`⚔️ ${STAGES[i]!.name} começou!`]); setResult(null); setStage(i); setActive(null);
  };

  useEffect(() => {
    if (stage === null || result) return;
    const t = setTimeout(() => {
      const alive = order.current.filter((u) => u.hp > 0);
      let actor = order.current[pos.current % order.current.length]!;
      while (actor.hp <= 0) { pos.current++; actor = order.current[pos.current % order.current.length]!; }
      pos.current++;
      const snap = new Map(alive.map((u) => [u.uid, { hp: u.hp, shield: u.shield }]));
      setActive(actor.uid);
      const res = act(actor, alive);
      const dir = actor.side === "hero" ? 1 : -1;
      const gold = token("--primary"); const green = token("--hp-hero"); const red = token("--destructive");
      const actorEl = sprites.current[actor.uid];
      playActor(actorEl, dir, res.skill.kind, !!res.skill.ultimate, gold, green);
      if (res.skill.ultimate) {
        shakeArena(arena.current);
        run(actorEl, [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], 260);
      }
      res.targets.forEach((t) => {
        const b = snap.get(t.uid);
        if (!b) return;
        const el = sprites.current[t.uid];
        const lost = b.hp - t.hp + (b.shield - t.shield);
        const gained = t.hp - b.hp;
        const guarded = t.shield - b.shield;
        if (lost > 0) { playHurt(el); popup(arena.current, el, `-${lost}`, red); }
        else if (gained > 0) { playHealed(el, green); popup(arena.current, el, `+${gained}`, green); }
        else if (guarded > 0) { playGuard(el, gold); popup(arena.current, el, `🛡${guarded}`, gold); }
      });
      const heroes = alive.filter((u) => u.side === "hero" && u.hp > 0).length;
      const foes = alive.filter((u) => u.side === "enemy" && u.hp > 0).length;
      if (res.msg) setLog((l) => [res.msg, ...l].slice(0, 40));
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
              <div className="flex -space-x-4">{s.enemies.map((e, j) => <img key={j} src={IMG[e.id]} alt={e.name} loading="lazy" className="w-14 h-14 rounded-full bg-secondary border-2 border-border object-cover" />)}</div>
            </button>
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-3xl w-full">
          {HEROES.map((h) => (
            <div key={h.id} className="rounded-xl bg-secondary p-4">
              <img src={IMG[h.id]} alt={h.name} loading="lazy" className="w-full aspect-square object-contain mb-2" />
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

      <div className="max-w-6xl mx-auto mb-6">
        <Arena units={units} active={active} sprites={sprites} arena={arena} result={result} />
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
        <div className="fixed inset-x-0 bottom-0 flex justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto bg-card border-2 border-primary rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
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

/* ---------------- battle arena ---------------- */
function Arena({ units, active, sprites, arena, result }: {
  units: Unit[]; active: string | null; sprites: Refs;
  arena: React.MutableRefObject<HTMLDivElement | null>; result: "win" | "lose" | null;
}) {
  const rows: Record<"hero" | "enemy", Unit[]> = {
    hero: units.filter((u) => u.side === "hero"),
    enemy: units.filter((u) => u.side === "enemy"),
  };
  return (
    <div ref={arena} className="relative overflow-hidden rounded-xl border-2 border-border bg-secondary">
      <div className="arena-sky absolute inset-0" aria-hidden />
      <div className="arena-floor absolute inset-x-0 bottom-0 h-24" aria-hidden />
      <div className="relative flex min-h-[260px] items-end justify-between gap-1 px-2 pb-14 pt-10 sm:gap-3 sm:px-6">
        <div className="flex items-end gap-0.5 sm:gap-3">
          {rows.hero.map((u, i) => (
            <Sprite key={u.uid} u={u} index={i} active={active === u.uid} sprites={sprites} result={result} />
          ))}
        </div>
        <div className="flex items-end gap-0.5 sm:gap-3">
          {rows.enemy.map((u, i) => (
            <Sprite key={u.uid} u={u} index={i} active={active === u.uid} sprites={sprites} result={result} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Sprite({ u, index, active, sprites, result }: {
  u: Unit; index: number; active: boolean; sprites: Refs; result: "win" | "lose" | null;
}) {
  const dead = u.hp <= 0;
  const boss = u.id === "boss";
  const pct = Math.max(0, (u.hp / u.maxHp) * 100);
  const mood = dead ? ""
    : result === "win" ? (u.side === "hero" ? "px-win" : "")
    : result === "lose" ? (u.side === "enemy" ? "px-win" : "px-sad")
    : "";
  return (
    <div className={`flex flex-col items-center gap-1 ${boss ? "w-24 sm:w-36 md:w-40" : "w-20 sm:w-28 md:w-32"}`}>
      <div
        ref={(el) => { sprites.current[u.uid] = el; }}
        className={`flex flex-col items-center ${dead ? "px-dead" : ""} ${mood}`}
        style={mood ? { animationDelay: `${index * 0.13}s` } : undefined}
      >
        <div className={`h-4 text-xs leading-none text-primary ${active && !dead ? "px-bob" : "opacity-0"}`} aria-hidden>▲</div>
        <img
          src={PIX[u.id]}
          alt={u.name}
          loading="lazy"
          width={boss ? 178 : 125}
          height={boss ? 160 : 140}
          style={{ animationDelay: `${index * 0.22}s` }}
          className={`pixel px-bob h-auto w-auto max-w-full ${boss ? "max-h-32 sm:max-h-40 md:max-h-48" : "max-h-20 sm:max-h-28 md:max-h-32"}`}
        />
      </div>
      <div className="w-full">
        <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
          <div
            className={`h-full transition-all duration-300 ${u.side === "hero" ? "bg-hp-hero" : "bg-destructive"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-0.5 truncate text-center text-[10px] leading-tight text-muted-foreground">{u.name}</div>
      </div>
    </div>
  );
}

function UnitCard({ u, active }: { u: Unit; active: boolean }) {
  const dead = u.hp <= 0;
  const pct = (u.hp / u.maxHp) * 100;
  return (
    <div className={`rounded-xl border-2 bg-card p-3 flex gap-3 items-center transition ${active ? "border-primary scale-[1.02]" : "border-border"} ${dead ? "opacity-30 grayscale" : ""}`}>
      <img src={PIX[u.id]} alt={u.name} loading="lazy" className={`pixel rounded-lg bg-secondary object-contain p-1 ${u.id === "boss" ? "w-24 h-24" : "w-16 h-16"}`} />
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
