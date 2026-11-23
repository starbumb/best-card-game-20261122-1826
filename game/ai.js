// EMBERFALL opponent AI for Captain Vex: plays for value, trades up,
// protects its hero with Guards, finishes with spells, and races when ahead.
// Returns a list of actions the UI replays with delays so the player can
// read and counter what Vex is doing.

import { cardById } from "./cards.js";
import {
  attack, canAttack, canPlayCreature, effectiveAtk, legalTargets,
  playCreature, playSpell,
} from "./state.js";

function cardValue(def) {
  if (def.kind === "spell") return def.cost * 1.6 + 1;
  let v = def.atk * 1.2 + def.hp;
  if (def.ability === "guard") v += 1.5;
  if (def.ability === "swift") v += 1;
  if (def.ability === "shield") v += 1;
  if (def.ability === "drain") v += 1.2;
  return v;
}

export function planAiTurn(state) {
  const actions = [];
  const ai = state.ai;

  // 1. Play creatures: best value per energy first, Guards before others
  //    when the player threatens lethal.
  let guard = 0;
  while (guard++ < 8) {
    let bestIdx = -1;
    let bestScore = -1;
    ai.hand.forEach((id, i) => {
      const def = cardById(id);
      if (def.kind !== "creature" || !canPlayCreature(state, ai, def)) return;
      let score = cardValue(def) / Math.max(1, def.cost);
      const playerThreat = state.player.board.reduce(
        (s, c) => s + (c ? effectiveAtk(state, c) : 0), 0);
      if (def.ability === "guard" && playerThreat >= ai.life - 4) score += 3;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    if (bestIdx < 0) break;
    const slot = ai.board.findIndex((s) => s === null);
    if (slot < 0) break;
    if (playCreature(state, "ai", bestIdx, slot)) {
      actions.push({ type: "play", slot });
    } else break;
  }

  // 2. Spells: heal when low, wave against a wide board, bolt for lethal
  //    or to remove a big threat, buff the biggest creature, draw when thin.
  guard = 0;
  while (guard++ < 6) {
    let acted = false;
    for (let i = 0; i < ai.hand.length; i++) {
      const def = cardById(ai.hand[i]);
      if (def.kind !== "spell" || ai.energy < def.cost) continue;
      if (def.effect === "heal4" && ai.life <= 12) {
        playSpell(state, "ai", i, null); acted = true;
      } else if (def.effect === "draw2" && ai.hand.length <= 3) {
        playSpell(state, "ai", i, null); acted = true;
      } else if (def.effect === "wave2" &&
        state.player.board.filter(Boolean).length >= 2) {
        playSpell(state, "ai", i, null); acted = true;
      } else if (def.effect === "damage3") {
        if (state.player.life <= 3) {
          playSpell(state, "ai", i, { hero: "player" }); acted = true;
        } else {
          const big = state.player.board.findIndex(
            (c) => c && effectiveAtk(state, c) >= 4);
          if (big >= 0) {
            playSpell(state, "ai", i, { side: "player", slot: big });
            acted = true;
          }
        }
      } else if (def.effect === "buff22" || def.effect === "buff30") {
        let bestSlot = -1; let bestAtk = -1;
        ai.board.forEach((c, s) => {
          if (c && effectiveAtk(state, c) > bestAtk) {
            bestAtk = effectiveAtk(state, c); bestSlot = s;
          }
        });
        if (bestSlot >= 0) {
          playSpell(state, "ai", i, { side: "ai", slot: bestSlot });
          acted = true;
        }
      }
      if (acted) { actions.push({ type: "spell" }); break; }
    }
    if (!acted) break;
  }

  // 3. Attacks: take lethal on the hero, make favourable trades,
  //    otherwise go face when ahead on life.
  for (let slot = 0; slot < ai.board.length; slot++) {
    const c = ai.board[slot];
    if (!canAttack(state, c)) continue;
    const power = effectiveAtk(state, c);
    const legal = legalTargets(state, "ai");
    let target = null;
    if (legal.hero && power >= state.player.life) {
      target = { hero: true };
    } else if (legal.slots.length > 0) {
      // Prefer a kill where we survive or trade up.
      let bestSlot = -1; let bestScore = -Infinity;
      for (const s of legal.slots) {
        const d = state.player.board[s];
        const kills = power >= d.hp;
        const survives = effectiveAtk(state, d) < c.hp;
        let score = effectiveAtk(state, d) + d.hp * 0.5;
        if (kills && survives) score += 10;
        else if (kills) score += 4;
        else score -= 6;
        if (d.ability === "guard") score += 2;
        if (score > bestScore) { bestScore = score; bestSlot = s; }
      }
      const mustFight = !legal.hero;
      if (mustFight || bestScore > 2 || ai.life <= state.player.life) {
        target = { slot: bestSlot };
      } else if (legal.hero) {
        target = { hero: true };
      }
    } else if (legal.hero) {
      target = { hero: true };
    }
    if (target && attack(state, "ai", slot, target)) {
      actions.push({ type: "attack", fromSlot: slot, target });
    }
  }
  return actions;
}
