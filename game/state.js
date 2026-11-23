// EMBERFALL game state and rules engine: heroes, energy, hands, boards,
// combat with Guard / Shield / Drain / Surge, and win-loss detection.
// Pure logic with no DOM access, so the AI and the UI share one rulebook.

import { buildDeck, cardById, mulberry32 } from "./cards.js";

export const MAX_LIFE = 20;
export const BOARD_SLOTS = 3;
export const HAND_LIMIT = 7;
export const ROUND_CAP = 12;

let uidCounter = 1;

export function makeCreature(cardDef, owner) {
  return {
    uid: uidCounter++,
    cardId: cardDef.id,
    owner,
    atk: cardDef.atk,
    hp: cardDef.hp,
    maxHp: cardDef.hp,
    ability: cardDef.ability || null,
    sigil: cardDef.sigil,
    justPlayed: true,
    attacked: false,
    shieldUp: cardDef.ability === "shield",
  };
}

export function newGame(seed = Date.now() % 100000) {
  const rng = mulberry32(seed);
  const mk = (name, heroArt) => ({
    name,
    heroArt,
    life: MAX_LIFE,
    energy: 0,
    maxEnergy: 0,
    deck: buildDeck(rng),
    hand: [],
    board: [null, null, null],
  });
  const state = {
    rng,
    round: 1,
    turn: "player",
    phase: "playing", // playing | won | lost
    player: mk("You — the Embercaller", "🧙"),
    ai: mk("Captain Vex", "🦹"),
    log: [],
    lastEvent: null,
  };
  drawCards(state, state.player, 4);
  drawCards(state, state.ai, 4);
  startTurn(state, state.player);
  return state;
}

export function drawCards(state, side, n) {
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      side.life -= 1; // fatigue: an empty deck bites
      state.log.push(`${side.name} is fatigued (-1 life).`);
      continue;
    }
    if (side.hand.length >= HAND_LIMIT) {
      side.deck.pop();
      continue;
    }
    side.hand.push(side.deck.pop());
  }
}

export function startTurn(state, side) {
  side.maxEnergy = Math.min(8, side.maxEnergy + 1);
  side.energy = side.maxEnergy;
  for (const c of side.board) {
    if (c) {
      c.justPlayed = false;
      c.attacked = false;
    }
  }
}

export function endTurn(state) {
  if (state.phase !== "playing") return;
  if (state.turn === "player") {
    state.turn = "ai";
    drawCards(state, state.ai, 1);
    startTurn(state, state.ai);
  } else {
    state.turn = "player";
    state.round += 1;
    if (state.round > ROUND_CAP) {
      finishByScore(state);
      return;
    }
    drawCards(state, state.player, 1);
    startTurn(state, state.player);
  }
  checkGameOver(state);
}

export function finishByScore(state) {
  if (state.player.life >= state.ai.life) state.phase = "won";
  else state.phase = "lost";
  state.log.push("The twelfth round ends — the higher life total wins.");
}

export function checkGameOver(state) {
  if (state.phase !== "playing") return;
  if (state.ai.life <= 0) state.phase = "won";
  else if (state.player.life <= 0) state.phase = "lost";
}

export function effectiveAtk(state, creature) {
  let atk = creature.atk;
  if (creature.ability === "surge") {
    const side = creature.owner === "player" ? state.player : state.ai;
    for (const c of side.board) {
      if (c && c !== creature && c.sigil === creature.sigil) atk += 1;
    }
  }
  return atk;
}

export function canPlayCreature(state, side, cardDef) {
  return side.energy >= cardDef.cost && side.board.some((s) => s === null);
}

export function playCreature(state, sideKey, handIndex, slot) {
  const side = state[sideKey];
  const cardId = side.hand[handIndex];
  const def = cardById(cardId);
  if (!def || def.kind !== "creature") return false;
  if (side.energy < def.cost || side.board[slot] !== null) return false;
  side.energy -= def.cost;
  side.hand.splice(handIndex, 1);
  const creature = makeCreature(def, sideKey);
  if (def.ability === "swift") creature.justPlayed = false;
  side.board[slot] = creature;
  state.log.push(`${side.name} plays ${def.name}.`);
  state.lastEvent = { type: "play", side: sideKey, slot };
  return true;
}

// Spells that need a target return "needs-target"; instant ones resolve here.
export function playSpell(state, sideKey, handIndex, target) {
  const side = state[sideKey];
  const foe = sideKey === "player" ? state.ai : state.player;
  const foeKey = sideKey === "player" ? "ai" : "player";
  const cardId = side.hand[handIndex];
  const def = cardById(cardId);
  if (!def || def.kind !== "spell" || side.energy < def.cost) return false;
  const needsTarget = ["damage3", "buff22", "buff30"].includes(def.effect);
  if (needsTarget && !target) return "needs-target";
  side.energy -= def.cost;
  side.hand.splice(handIndex, 1);
  if (def.effect === "heal4") {
    side.life = Math.min(MAX_LIFE, side.life + 4);
  } else if (def.effect === "draw2") {
    drawCards(state, side, 2);
  } else if (def.effect === "wave2") {
    for (let i = 0; i < BOARD_SLOTS; i++) {
      if (foe.board[i]) damageCreature(state, foeKey, i, 2);
    }
  } else if (def.effect === "damage3") {
    if (target.hero) {
      const victim = target.hero === "player" ? state.player : state.ai;
      victim.life -= 3;
    } else {
      damageCreature(state, target.side, target.slot, 3);
    }
  } else if (def.effect === "buff22" || def.effect === "buff30") {
    const c = side.board[target.slot];
    if (c) {
      if (def.effect === "buff22") { c.atk += 2; c.hp += 2; c.maxHp += 2; }
      else c.atk += 3;
    }
  }
  state.log.push(`${side.name} casts ${def.name}.`);
  state.lastEvent = { type: "spell", side: sideKey };
  checkGameOver(state);
  return true;
}

export function damageCreature(state, sideKey, slot, amount) {
  const side = state[sideKey];
  const c = side.board[slot];
  if (!c) return 0;
  if (c.shieldUp) {
    c.shieldUp = false;
    state.log.push(`${cardById(c.cardId).name}'s Shield absorbs the blow.`);
    return 0;
  }
  c.hp -= amount;
  if (c.hp <= 0) {
    state.log.push(`${cardById(c.cardId).name} falls.`);
    side.board[slot] = null;
  }
  return amount;
}

export function legalTargets(state, attackerKey) {
  const foe = attackerKey === "player" ? state.ai : state.player;
  const guards = [];
  foe.board.forEach((c, i) => { if (c && c.ability === "guard") guards.push(i); });
  if (guards.length > 0) return { slots: guards, hero: false };
  const slots = [];
  foe.board.forEach((c, i) => { if (c) slots.push(i); });
  return { slots, hero: true };
}

export function canAttack(state, creature) {
  return creature && !creature.justPlayed && !creature.attacked && state.phase === "playing";
}

// target: {slot: n} for a creature, or {hero: true} for the opposing hero.
export function attack(state, sideKey, fromSlot, target) {
  const side = state[sideKey];
  const foeKey = sideKey === "player" ? "ai" : "player";
  const foe = state[foeKey];
  const attacker = side.board[fromSlot];
  if (!canAttack(state, attacker)) return false;
  const legal = legalTargets(state, sideKey);
  const power = effectiveAtk(state, attacker);
  let dealt = 0;
  if (target.hero) {
    if (!legal.hero) return false;
    foe.life -= power;
    dealt = power;
    state.log.push(`${cardById(attacker.cardId).name} strikes ${foe.name} for ${power}.`);
  } else {
    if (!legal.slots.includes(target.slot)) return false;
    const defender = foe.board[target.slot];
    const defPower = effectiveAtk(state, defender);
    dealt = damageCreature(state, foeKey, target.slot, power);
    // The defender strikes back if it survives.
    if (foe.board[target.slot]) damageCreature(state, sideKey, fromSlot, defPower);
    state.log.push(`${cardById(attacker.cardId).name} battles ${cardById(defender.cardId).name}.`);
  }
  if (attacker.ability === "drain" && dealt > 0) {
    side.life = Math.min(MAX_LIFE, side.life + dealt);
  }
  attacker.attacked = true;
  state.lastEvent = { type: "attack", side: sideKey, fromSlot, target };
  checkGameOver(state);
  return true;
}

export function scoreOf(side) {
  return side.life;
}
