export type Side = "hero" | "enemy";
export type Skill = {
  name: string;
  cooldown: number;
  kind: "damage" | "aoe" | "heal" | "shield";
  power: number;
  ultimate?: boolean;
};
export type UnitDef = { id: string; name: string; emoji: string; hp: number; atk: number; def: number; spd: number; skills: Skill[] };
export type Unit = UnitDef & { uid: string; side: Side; maxHp: number; shield: number; cds: number[] };

export const HEROES: UnitDef[] = [
  { id: "knight", name: "Cavaleiro", emoji: "🛡️", hp: 260, atk: 22, def: 12, spd: 8, skills: [
    { name: "Golpe de Espada", cooldown: 0, kind: "damage", power: 1 },
    { name: "Muralha de Escudo", cooldown: 3, kind: "shield", power: 40 },
    { name: "Juízo Sagrado", cooldown: 6, kind: "aoe", power: 1.8, ultimate: true },
  ]},
  { id: "mage", name: "Mago", emoji: "🧙", hp: 150, atk: 30, def: 4, spd: 10, skills: [
    { name: "Bola de Fogo", cooldown: 0, kind: "damage", power: 1 },
    { name: "Luz Curativa", cooldown: 3, kind: "heal", power: 45 },
    { name: "Meteoro", cooldown: 6, kind: "aoe", power: 2.2, ultimate: true },
  ]},
  { id: "archer", name: "Arqueira", emoji: "🏹", hp: 170, atk: 27, def: 6, spd: 14, skills: [
    { name: "Flecha Precisa", cooldown: 0, kind: "damage", power: 1.1 },
    { name: "Chuva de Flechas", cooldown: 3, kind: "aoe", power: 0.8 },
    { name: "Tiro Mortal", cooldown: 5, kind: "damage", power: 3.5, ultimate: true },
  ]},
];

const G = {
  lancer: { id: "lancer", name: "Goblin Lanceiro", emoji: "🔱", hp: 80, atk: 16, def: 4, spd: 11, skills: [
    { name: "Estocada", cooldown: 0, kind: "damage", power: 1 },
    { name: "Investida", cooldown: 3, kind: "damage", power: 1.6 },
    { name: "Perfuração", cooldown: 5, kind: "damage", power: 2.4, ultimate: true },
  ]},
  warrior: { id: "warrior", name: "Goblin Guerreiro", emoji: "🪓", hp: 110, atk: 14, def: 7, spd: 7, skills: [
    { name: "Machadada", cooldown: 0, kind: "damage", power: 1 },
    { name: "Pele Dura", cooldown: 3, kind: "shield", power: 25 },
    { name: "Fúria", cooldown: 5, kind: "aoe", power: 1.3, ultimate: true },
  ]},
  shaman: { id: "shaman", name: "Goblin Mago", emoji: "🔮", hp: 65, atk: 18, def: 2, spd: 9, skills: [
    { name: "Dardo Sombrio", cooldown: 0, kind: "damage", power: 1 },
    { name: "Cura Tribal", cooldown: 3, kind: "heal", power: 30 },
    { name: "Explosão Tóxica", cooldown: 5, kind: "aoe", power: 1.2, ultimate: true },
  ]},
  boss: { id: "boss", name: "HOBGOBLIN", emoji: "👹", hp: 900, atk: 30, def: 10, spd: 9, skills: [
    { name: "Clava Esmagadora", cooldown: 0, kind: "damage", power: 1.3 },
    { name: "Rugido de Guerra", cooldown: 3, kind: "shield", power: 80 },
    { name: "Terremoto", cooldown: 4, kind: "aoe", power: 1.6, ultimate: true },
  ]},
} satisfies Record<string, UnitDef>;

export const STAGES = [
  { name: "Fase 1 — Floresta", desc: "Uma patrulha goblin", enemies: [G.lancer, G.warrior, G.lancer] },
  { name: "Fase 2 — Cavernas", desc: "Os xamãs aparecem", enemies: [G.warrior, G.shaman, G.lancer, G.shaman] },
  { name: "Fase 3 — Acampamento", desc: "A guarda de elite", enemies: [G.warrior, G.warrior, G.lancer, G.shaman, G.shaman] },
  { name: "Fase 4 — Trono", desc: "O BOSS Hobgoblin", enemies: [G.shaman, G.boss, G.warrior] },
];

let n = 0;
export const spawn = (d: UnitDef, side: Side, mult = 1): Unit => ({
  ...d, hp: Math.round(d.hp * mult), maxHp: Math.round(d.hp * mult), atk: Math.round(d.atk * mult),
  uid: `${d.id}-${n++}`, side, shield: 0, cds: d.skills.map(() => 0),
});

export function act(actor: Unit, all: Unit[]): string {
  const allies = all.filter((u) => u.side === actor.side && u.hp > 0);
  const foes = all.filter((u) => u.side !== actor.side && u.hp > 0);
  if (!foes.length) return "";
  actor.cds = actor.cds.map((c) => Math.max(0, c - 1));
  const hurt = allies.filter((a) => a.hp < a.maxHp * 0.6);
  let idx = 0;
  for (let i = 2; i >= 1; i--) {
    const s = actor.skills[i];
    if (actor.cds[i] > 0) continue;
    if (s.kind === "heal" && !hurt.length) continue;
    idx = i; break;
  }
  const s = actor.skills[idx];
  actor.cds[idx] = s.cooldown;
  const hit = (t: Unit, p: number) => {
    let dmg = Math.max(1, Math.round(actor.atk * p * (0.9 + Math.random() * 0.2) - t.def));
    const abs = Math.min(t.shield, dmg); t.shield -= abs; dmg -= abs;
    t.hp = Math.max(0, t.hp - dmg); return dmg + abs;
  };
  const tag = s.ultimate ? "⚡ SUPREMA " : "";
  switch (s.kind) {
    case "damage": {
      const t = foes.reduce((a, b) => (a.hp < b.hp ? a : b));
      return `${actor.name} usa ${tag}${s.name} em ${t.name}: ${hit(t, s.power)} de dano`;
    }
    case "aoe": {
      const total = foes.reduce((sum, t) => sum + hit(t, s.power), 0);
      return `${actor.name} usa ${tag}${s.name} em todos: ${total} de dano total`;
    }
    case "heal": {
      const t = hurt.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
      t.hp = Math.min(t.maxHp, t.hp + s.power);
      return `${actor.name} usa ${tag}${s.name} e cura ${t.name} em ${s.power}`;
    }
    case "shield": {
      allies.forEach((a) => (a.shield += s.power));
      return `${actor.name} usa ${tag}${s.name}: aliados ganham ${s.power} de escudo`;
    }
  }
}
