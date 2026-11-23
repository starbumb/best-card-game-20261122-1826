// EMBERFALL bootstrap: screen flow (title -> battle -> win/loss), mouse and
// keyboard input, AI turn playback, and deterministic screenshot states
// (?shot=title|battle|win|loss&seed=N) that render the real game code.

import { SIGILS, cardById } from "./cards.js";
import {
  BOARD_SLOTS, MAX_LIFE, ROUND_CAP, attack, canAttack, endTurn,
  legalTargets, newGame, playCreature, playSpell,
} from "./state.js";
import { planAiTurn } from "./ai.js";
import { cardBack, cardFace, confettiBurst, creatureFace, el, energyPips, floatText, heroPanel } from "./render.js";
import { isMuted, sfx, toggleMute } from "./audio.js";

const params = new URLSearchParams(location.search);
const SHOT = params.get("shot");
const SEED = Number(params.get("seed") || 42);

let state = null;
let selectedHand = -1;   // index into player hand
let selectedAttacker = -1; // player board slot
let pendingSpell = -1;   // hand index awaiting a target
let busy = false;
let stats = { played: 0, kills: 0, damage: 0 };

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  for (const s of ["title-screen", "battle-screen", "end-screen"]) {
    $(s).classList.toggle("hidden", s !== id);
  }
}

function buildTitle() {
  const row = $("sigil-row");
  row.innerHTML = "";
  for (const key of Object.keys(SIGILS)) {
    const s = SIGILS[key];
    const chip = el("div", "sigil-chip");
    const shape = el("span", "", s.shape);
    shape.style.color = s.color;
    chip.append(shape, el("span", "", s.name));
    row.append(chip);
  }
  const showcase = $("title-cards");
  showcase.innerHTML = "";
  const picks = ["phoenix-kin", "deep-leviathan", "tempest-roc", "world-tortoise"];
  picks.forEach((id, i) => {
    const c = cardFace(cardById(id));
    c.style.setProperty("--tilt", `${(i - 1.5) * 4}deg`);
    showcase.append(c);
  });
}

function hint(text) {
  $("hint").textContent = text;
}

function renderLog() {
  const log = $("log");
  log.innerHTML = "";
  for (const line of state.log.slice(-6)) log.append(el("div", "", line));
  log.scrollTop = log.scrollHeight;
}

function render() {
  if (!state) return;
  $("round-badge").textContent = `Round ${Math.min(state.round, ROUND_CAP)} / ${ROUND_CAP}`;
  const banner = $("turn-banner");
  const myTurn = state.turn === "player" && state.phase === "playing";
  banner.textContent = state.phase !== "playing" ? "Duel over" : myTurn ? "YOUR TURN" : "VEX IS THINKING…";
  banner.classList.toggle("enemy", !myTurn && state.phase === "playing");

  // Enemy hero + hand backs
  const enemySide = $("enemy-side");
  enemySide.innerHTML = "";
  const enemyHero = heroPanel(state.ai, "ai", state.turn === "ai");
  if (selectedAttacker >= 0 && legalTargets(state, "player").hero) {
    enemyHero.classList.add("target-ok");
    enemyHero.onclick = () => doAttack({ hero: true });
  }
  if (pendingSpell >= 0) {
    const def = cardById(state.player.hand[pendingSpell]);
    if (def && def.effect === "damage3") {
      enemyHero.classList.add("target-ok");
      enemyHero.onclick = () => castPending({ hero: "ai" });
    }
  }
  enemySide.append(enemyHero);
  const backs = el("div", "enemy-hand");
  for (let i = 0; i < state.ai.hand.length; i++) backs.append(cardBack());
  enemySide.append(backs);

  renderBoard("ai");
  renderBoard("player");

  // Player hero + energy
  const playerSide = $("player-side");
  playerSide.innerHTML = "";
  playerSide.append(heroPanel(state.player, "player", myTurn), energyPips(state.player));

  // Player hand
  const hand = $("player-hand");
  hand.innerHTML = "";
  state.player.hand.forEach((id, i) => {
    const def = cardById(id);
    const wrap = el("div", "card-wrap");
    const card = cardFace(def);
    card.classList.add("hand-card");
    const playable = myTurn && !busy && state.player.energy >= def.cost &&
      (def.kind === "spell" || state.player.board.some((s) => s === null));
    if (!playable) card.classList.add("unplayable");
    if (i === selectedHand || i === pendingSpell) card.classList.add("selected");
    wrap.append(card, el("span", "key-hint", String(i + 1)));
    card.onclick = () => onHandClick(i);
    hand.append(wrap);
  });
  if (state.player.hand.length === 0) {
    hand.append(el("div", "slot-label", "YOUR HAND IS EMPTY"));
  }

  $("end-turn").disabled = !myTurn || busy;
  $("mute").textContent = isMuted() ? "🔇 Sound off" : "🔊 Sound on";
  renderLog();
}

function renderBoard(sideKey) {
  const row = $(sideKey === "ai" ? "enemy-board" : "player-board");
  row.innerHTML = "";
  const side = state[sideKey];
  const legal = selectedAttacker >= 0 ? legalTargets(state, "player") : null;
  for (let slot = 0; slot < BOARD_SLOTS; slot++) {
    const cell = el("div", "slot");
    const creature = side.board[slot];
    if (creature) {
      const face = creatureFace(state, creature);
      face.classList.add("board-card");
      if (sideKey === "player") {
        if (canAttack(state, creature) && state.turn === "player" && !busy) face.classList.add("ready");
        else if (creature.attacked) face.classList.add("spent");
        else if (creature.justPlayed) face.classList.add("sleeping");
        if (slot === selectedAttacker) face.classList.add("selected");
        face.onclick = () => onOwnCreatureClick(slot);
        if (pendingSpell >= 0) {
          const def = cardById(state.player.hand[pendingSpell]);
          if (def && (def.effect === "buff22" || def.effect === "buff30")) {
            cell.classList.add("drop-ok");
            cell.onclick = () => castPending({ side: "player", slot });
          }
        }
      } else {
        if (legal && legal.slots.includes(slot)) {
          cell.classList.add("target-ok");
          cell.onclick = () => doAttack({ slot });
        }
        if (pendingSpell >= 0) {
          const def = cardById(state.player.hand[pendingSpell]);
          if (def && def.effect === "damage3") {
            cell.classList.add("target-ok");
            cell.onclick = () => castPending({ side: "ai", slot });
          }
        }
      }
      cell.append(face);
    } else {
      cell.append(el("div", "slot-label", sideKey === "player" ? `SLOT ${"QWE"[slot]}` : "EMPTY"));
      if (sideKey === "player" && selectedHand >= 0) {
        cell.classList.add("drop-ok");
        cell.onclick = () => placeSelected(slot);
      }
    }
    row.append(cell);
  }
}

function onHandClick(i) {
  if (busy || state.turn !== "player" || state.phase !== "playing") return;
  const def = cardById(state.player.hand[i]);
  if (state.player.energy < def.cost) { sfx.error(); hint("Not enough energy for that card."); return; }
  selectedAttacker = -1;
  if (def.kind === "creature") {
    if (!state.player.board.some((s) => s === null)) { sfx.error(); hint("Your board is full."); return; }
    selectedHand = selectedHand === i ? -1 : i;
    pendingSpell = -1;
    sfx.select();
    hint(selectedHand >= 0 ? `Click a glowing slot (or press Q / W / E) to play ${def.name}.` : "");
  } else {
    selectedHand = -1;
    const result = playSpell(state, "player", i, null);
    if (result === "needs-target") {
      pendingSpell = i;
      sfx.select();
      hint(def.effect === "damage3" ? "Choose a target: an enemy creature or Vex himself." : "Choose one of your creatures to empower.");
    } else if (result) {
      stats.played++;
      sfx.spell();
      afterAction();
    }
  }
  render();
}

function castPending(target) {
  if (pendingSpell < 0) return;
  const idx = pendingSpell;
  pendingSpell = -1;
  if (playSpell(state, "player", idx, target)) {
    stats.played++;
    sfx.spell();
  } else sfx.error();
  afterAction();
}

function placeSelected(slot) {
  if (selectedHand < 0) return;
  if (playCreature(state, "player", selectedHand, slot)) {
    stats.played++;
    sfx.play();
    selectedHand = -1;
    hint("");
  } else sfx.error();
  render();
}

function onOwnCreatureClick(slot) {
  if (busy || state.turn !== "player" || state.phase !== "playing") return;
  const c = state.player.board[slot];
  if (!canAttack(state, c)) {
    if (c && c.justPlayed) hint("That creature just arrived — it attacks next turn (Swift aside).");
    else if (c && c.attacked) hint("That creature already attacked this turn.");
    sfx.error();
    return;
  }
  selectedHand = -1;
  pendingSpell = -1;
  selectedAttacker = selectedAttacker === slot ? -1 : slot;
  sfx.select();
  const legal = legalTargets(state, "player");
  hint(selectedAttacker >= 0
    ? (legal.hero ? "Click an enemy creature — or Vex himself — to strike." : "A Guard blocks the way: you must attack the Guard first.")
    : "");
  render();
}

function doAttack(target) {
  if (selectedAttacker < 0) return;
  const from = selectedAttacker;
  selectedAttacker = -1;
  const before = state.ai.life;
  if (attack(state, "player", from, target)) {
    sfx.attack();
    stats.damage += Math.max(0, before - state.ai.life);
    const row = $("player-board");
    const cell = row.children[from];
    if (cell) { cell.classList.add("lunge"); setTimeout(() => cell.classList.remove("lunge"), 340); }
    if (target.hero) {
      const heroEl = document.querySelector('.hero[data-side="ai"]');
      if (heroEl) floatText(heroEl, `-${before - state.ai.life}`, "");
    }
  } else sfx.error();
  hint("");
  afterAction();
}

function afterAction() {
  render();
  if (state.phase !== "playing") setTimeout(showEnd, 700);
}

function endPlayerTurn() {
  if (busy || state.turn !== "player" || state.phase !== "playing") return;
  selectedHand = -1; selectedAttacker = -1; pendingSpell = -1;
  sfx.turn();
  endTurn(state);
  render();
  if (state.phase !== "playing") { setTimeout(showEnd, 600); return; }
  busy = true;
  render();
  setTimeout(runAiTurn, 650);
}

function runAiTurn() {
  const actions = planAiTurn(state);
  const hadAttack = actions.some((a) => a.type === "attack");
  const hadSpell = actions.some((a) => a.type === "spell");
  if (hadSpell) sfx.spell();
  if (hadAttack) sfx.attack();
  else if (actions.length) sfx.play();
  render();
  setTimeout(() => {
    if (state.phase !== "playing") { busy = false; showEnd(); return; }
    endTurn(state);
    busy = false;
    sfx.turn();
    hint(state.phase === "playing" ? "Your move. Click a card to play it, or a glowing creature to attack." : "");
    render();
    if (state.phase !== "playing") setTimeout(showEnd, 600);
  }, 800);
}

function showEnd() {
  const won = state.phase === "won";
  showScreen("end-screen");
  const title = $("end-title");
  title.textContent = won ? "🏆 VICTORY!" : "💀 DEFEAT";
  title.className = "end-title " + (won ? "win" : "lose");
  $("end-sub").textContent = won
    ? "Captain Vex's sigils gutter and die. The Emberfall is yours."
    : "Your sigils go dark. Captain Vex sails on, undefeated — this time.";
  $("end-stats").innerHTML = "";
  const rows = [
    ["Your life", state.player.life],
    ["Vex's life", state.ai.life],
    ["Rounds", Math.min(state.round, ROUND_CAP)],
    ["Cards played", stats.played],
    ["Hero damage", stats.damage],
  ];
  for (const [label, value] of rows) {
    const cell = el("div", "");
    cell.append(el("b", "", String(value)), el("div", "", label));
    $("end-stats").append(cell);
  }
  if (won) { sfx.win(); confettiBurst(document.body); }
  else sfx.lose();
}

function startGame(seed) {
  state = newGame(seed);
  selectedHand = -1; selectedAttacker = -1; pendingSpell = -1; busy = false;
  stats = { played: 0, kills: 0, damage: 0 };
  showScreen("battle-screen");
  hint("Your move. Click a card to play it, or a glowing creature to attack.");
  render();
}

// ---- deterministic screenshot states (real game code, fixed seed) ----
function shotState(kind) {
  state = newGame(SEED);
  selectedHand = -1; selectedAttacker = -1; pendingSpell = -1; busy = false;
  stats = { played: 7, kills: 3, damage: 11 };
  const put = (side, slot, id, hpDelta = 0, ready = true) => {
    const def = cardById(id);
    const c = {
      uid: 900 + slot + (side === "ai" ? 50 : 0), cardId: id, owner: side,
      atk: def.atk, hp: def.hp + hpDelta, maxHp: def.hp,
      ability: def.ability || null, sigil: def.sigil,
      justPlayed: !ready, attacked: false, shieldUp: def.ability === "shield",
    };
    state[side].board[slot] = c;
  };
  if (kind === "battle") {
    state.round = 5;
    state.player.life = 14; state.ai.life = 11;
    state.player.maxEnergy = 5; state.player.energy = 3;
    state.ai.maxEnergy = 5; state.ai.energy = 1;
    state.player.hand = ["magma-brute", "kindle-bolt", "mist-dancer", "healing-rain", "sky-lancer"];
    state.ai.hand = ["cinder-pup", "tidal-wave", "pebble-golem"];
    put("player", 0, "reef-warden");
    put("player", 1, "ash-sprite", -1);
    put("ai", 0, "storm-eel");
    put("ai", 2, "quarry-titan", -2);
    state.log = [
      "Captain Vex plays Quarry Titan.",
      "Ash Sprite battles Storm Eel.",
      "You — the Embercaller casts Second Wind.",
      "Reef Warden strikes Captain Vex for 2.",
    ];
    selectedHand = 0;
    showScreen("battle-screen");
    hint("Click a glowing slot (or press Q / W / E) to play Magma Brute.");
    render();
  } else if (kind === "win" || kind === "loss") {
    state.round = 9;
    if (kind === "win") { state.player.life = 9; state.ai.life = 0; state.phase = "won"; }
    else { state.player.life = 0; state.ai.life = 13; state.phase = "lost"; }
    showEnd();
  } else {
    showScreen("title-screen");
  }
}

function onKey(e) {
  if (e.key === "Enter") {
    if (!$("title-screen").classList.contains("hidden")) startGame(Date.now() % 100000);
    else if (!$("end-screen").classList.contains("hidden")) startGame(Date.now() % 100000);
    return;
  }
  if (e.key.toLowerCase() === "r" && !$("end-screen").classList.contains("hidden")) {
    startGame(Date.now() % 100000);
    return;
  }
  if (e.key.toLowerCase() === "h") {
    $("help-box").classList.toggle("hidden");
    return;
  }
  if (!state || state.phase !== "playing" || state.turn !== "player" || busy) return;
  if (e.key === " ") { e.preventDefault(); endPlayerTurn(); return; }
  if (e.key === "Escape") { selectedHand = -1; selectedAttacker = -1; pendingSpell = -1; hint(""); render(); return; }
  const num = Number(e.key);
  if (num >= 1 && num <= state.player.hand.length) { onHandClick(num - 1); return; }
  const slot = "qwe".indexOf(e.key.toLowerCase());
  if (slot >= 0 && selectedHand >= 0) placeSelected(slot);
}

function init() {
  buildTitle();
  $("play").onclick = () => { sfx.play(); startGame(Date.now() % 100000); };
  $("again").onclick = () => startGame(Date.now() % 100000);
  $("end-turn").onclick = endPlayerTurn;
  $("help-btn").onclick = () => $("help-box").classList.toggle("hidden");
  $("mute").onclick = () => { toggleMute(); render(); };
  document.addEventListener("keydown", onKey);
  if (SHOT) shotState(SHOT);
  else showScreen("title-screen");
}

init();
