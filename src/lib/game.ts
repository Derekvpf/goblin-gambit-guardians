import knight from "@/assets/knight.png";
import mage from "@/assets/mage.png";
import archer from "@/assets/archer.png";
import lancer from "@/assets/lancer.png";
import warrior from "@/assets/warrior.png";
import shaman from "@/assets/shaman.png";
import boss from "@/assets/boss.png";
import pxKnight from "@/assets/px-knight.png";
import pxMage from "@/assets/px-mage.png";
import pxArcher from "@/assets/px-archer.png";
import pxLancer from "@/assets/px-lancer.png";
import pxWarrior from "@/assets/px-warrior.png";
import pxShaman from "@/assets/px-shaman.png";
import pxBoss from "@/assets/px-boss.png";
export const IMG: Record<string, string> = { knight, mage, archer, lancer, warrior, shaman, boss };
export const PIX: Record<string, string> = {
  knight: pxKnight, mage: pxMage, archer: pxArcher,
  lancer: pxLancer, warrior: pxWarrior, shaman: pxShaman, boss: pxBoss,
};
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
  boss: { id: "boss", name: "HOBGOBLIN", emoji: "👹", hp: 700, atk: 28, def: 6, spd: 9, skills: [
    { name: "Clava Esmagadora", cooldown: 0, kind: "damage", power: 1.3 },
    { name: "Rugido de Guerra", cooldown: 3, kind: "shield", power: 80 },
    { name: "Terremoto", cooldown: 4, kind: "aoe", power: 1.4, ultimate: true },
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

export type ActResult = { msg: string; skill: Skill; targets: Unit[] };

export function act(actor: Unit, all: Unit[]): ActResult {
  const allies = all.filter((u) => u.side === actor.side && u.hp > 0);
  const foes = all.filter((u) => u.side !== actor.side && u.hp > 0);
  const none: ActResult = { msg: "", skill: actor.skills[0]!, targets: [] };
  if (!foes.length) return none;
  actor.cds = actor.cds.map((c) => Math.max(0, c - 1));
  const hurt = allies.filter((a) => a.hp < a.maxHp * 0.6);
  let idx = 0;
  for (let i = 2; i >= 1; i--) {
    const s = actor.skills[i]!;
    if (actor.cds[i]! > 0) continue;
    if (s.kind === "heal" && !hurt.length) continue;
    idx = i; break;
  }
  const s = actor.skills[idx]!;
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
      const d = hit(t, s.power);
      return { msg: `${actor.name} usa ${tag}${s.name} em ${t.name}: ${d} de dano`, skill: s, targets: [t] };
    }
    case "aoe": {
      const list = [...foes];
      const total = list.reduce((sum, t) => sum + hit(t, s.power), 0);
      return { msg: `${actor.name} usa ${tag}${s.name} em todos: ${total} de dano total`, skill: s, targets: list };
    }
    case "heal": {
      const t = hurt.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
      t.hp = Math.min(t.maxHp, t.hp + s.power);
      return { msg: `${actor.name} usa ${tag}${s.name} e cura ${t.name} em ${s.power}`, skill: s, targets: [t] };
    }
    case "shield": {
      const list = [...allies];
      list.forEach((a) => (a.shield += s.power));
      return { msg: `${actor.name} usa ${tag}${s.name}: aliados ganham ${s.power} de escudo`, skill: s, targets: list };
    }
  }
  return none;
}
