// EMBERFALL rendering: builds card faces, hands, boards, hero panels and
// the win / loss flourishes as DOM, with CSS-driven slide and flip motion.

import { ABILITIES, SIGILS, cardById } from "./cards.js";
import { MAX_LIFE, effectiveAtk } from "./state.js";

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function cardFace(def, opts = {}) {
  const sigil = SIGILS[def.sigil];
  const card = el("div", "card" + (opts.small ? " card-small" : ""));
  card.style.setProperty("--sigil", sigil.color);
  card.style.setProperty("--sigil-dark", sigil.dark);
  card.dataset.cardId = def.id;

  const head = el("div", "card-head");
  const cost = el("div", "card-cost", String(def.cost));
  cost.title = "Energy cost";
  const name = el("div", "card-name", def.name);
  const sig = el("div", "card-sigil", sigil.shape);
  sig.title = sigil.name;
  head.append(cost, name, sig);

  const art = el("div", "card-art", def.art);
  const kind = el("div", "card-kind",
    def.kind === "creature" ? `${sigil.name} Creature` : `${sigil.name} Spell`);
  const text = el("div", "card-text");
  if (def.kind === "creature" && def.ability) {
    const ab = el("div", "card-ability", ABILITIES[def.ability]);
    text.append(ab);
  }
  text.append(el("div", "card-flavour", def.text));

  card.append(head, art, kind, text);
  if (def.kind === "creature") {
    const stats = el("div", "card-stats");
    const atk = opts.atk !== undefined ? opts.atk : def.atk;
    const hp = opts.hp !== undefined ? opts.hp : def.hp;
    const atkBadge = el("div", "stat stat-atk", `⚔ ${atk}`);
    const hpBadge = el("div", "stat stat-hp" + (opts.hurt ? " stat-hurt" : ""), `♥ ${hp}`);
    stats.append(atkBadge, hpBadge);
    if (opts.shieldUp) stats.append(el("div", "stat stat-shield", "🛡"));
    card.append(stats);
  }
  return card;
}

export function creatureFace(state, creature) {
  const def = cardById(creature.cardId);
  return cardFace(def, {
    small: true,
    atk: effectiveAtk(state, creature),
    hp: creature.hp,
    hurt: creature.hp < creature.maxHp,
    shieldUp: creature.shieldUp,
  });
}

export function cardBack() {
  const back = el("div", "card card-back card-small");
  back.append(el("div", "card-back-sigil", "✦"));
  return back;
}

export function heroPanel(side, sideKey, isActive) {
  const panel = el("div", "hero" + (isActive ? " hero-active" : ""));
  panel.dataset.side = sideKey;
  const art = el("div", "hero-art", side.heroArt);
  const info = el("div", "hero-info");
  info.append(el("div", "hero-name", side.name));
  const lifeRow = el("div", "hero-life-row");
  const bar = el("div", "life-bar");
  const fill = el("div", "life-fill");
  fill.style.width = `${Math.max(0, (side.life / MAX_LIFE) * 100)}%`;
  if (side.life <= 6) fill.classList.add("life-low");
  bar.append(fill);
  lifeRow.append(el("span", "life-heart", "♥"), el("span", "life-num", String(side.life)), bar);
  const meta = el("div", "hero-meta",
    `⚡ ${side.energy}/${side.maxEnergy} energy · 🂠 ${side.deck.length} in deck`);
  info.append(lifeRow, meta);
  panel.append(art, info);
  return panel;
}

export function energyPips(side) {
  const wrap = el("div", "pips");
  for (let i = 0; i < side.maxEnergy; i++) {
    wrap.append(el("span", "pip" + (i < side.energy ? " pip-on" : ""), "◆"));
  }
  return wrap;
}

export function confettiBurst(container) {
  const colors = ["#ff6b35", "#3aa7ff", "#2fd68f", "#ffb62e", "#ff4d8d"];
  for (let i = 0; i < 90; i++) {
    const piece = el("div", "confetti");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.append(piece);
  }
}

export function floatText(parent, text, cls) {
  const n = el("div", "float-text " + (cls || ""), text);
  parent.append(n);
  setTimeout(() => n.remove(), 1200);
}
