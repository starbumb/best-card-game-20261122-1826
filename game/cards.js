// EMBERFALL card pool: four sigils (suits) told apart by colour AND shape,
// creature cards with cost / attack / health, and spell cards with effects.
// Every card is an original invention for this game.

export const SIGILS = {
  ember: { name: "Ember", shape: "▲", color: "#ff6b35", dark: "#7a2410", glyph: "E" },
  tide: { name: "Tide", shape: "●", color: "#3aa7ff", dark: "#123a63", glyph: "T" },
  gale: { name: "Gale", shape: "◆", color: "#2fd68f", dark: "#0d4d33", glyph: "G" },
  stone: { name: "Stone", shape: "■", color: "#ffb62e", dark: "#6b4510", glyph: "S" },
};

export const ABILITIES = {
  swift: "Swift — can attack the turn it is played.",
  guard: "Guard — enemies must attack this creature first.",
  drain: "Drain — heals your hero for the damage it deals.",
  surge: "Surge — +1 Attack for each ally of the same sigil.",
  shield: "Shield — ignores the first damage it takes.",
};

// kind: "creature" (atk/hp) or "spell" (effect key). cost = energy to play.
export const CARD_POOL = [
  { id: "cinder-pup", name: "Cinder Pup", sigil: "ember", kind: "creature", cost: 1, atk: 2, hp: 1, ability: "swift", art: "🐺", text: "A spark with teeth." },
  { id: "ash-sprite", name: "Ash Sprite", sigil: "ember", kind: "creature", cost: 2, atk: 2, hp: 2, ability: "surge", art: "🔥", text: "Dances where fires gather." },
  { id: "magma-brute", name: "Magma Brute", sigil: "ember", kind: "creature", cost: 4, atk: 4, hp: 4, ability: "guard", art: "🌋", text: "The mountain, walking." },
  { id: "phoenix-kin", name: "Phoenix Kin", sigil: "ember", kind: "creature", cost: 6, atk: 5, hp: 5, ability: "drain", art: "🦅", text: "Born from its own ending." },
  { id: "tide-minnow", name: "Tide Minnow", sigil: "tide", kind: "creature", cost: 1, atk: 1, hp: 3, ability: "shield", art: "🐟", text: "Small, slick, stubborn." },
  { id: "reef-warden", name: "Reef Warden", sigil: "tide", kind: "creature", cost: 3, atk: 2, hp: 5, ability: "guard", art: "🐢", text: "The reef remembers." },
  { id: "storm-eel", name: "Storm Eel", sigil: "tide", kind: "creature", cost: 3, atk: 3, hp: 3, ability: "swift", art: "⚡", text: "Lightning learned to swim." },
  { id: "deep-leviathan", name: "Deep Leviathan", sigil: "tide", kind: "creature", cost: 7, atk: 7, hp: 7, ability: "shield", art: "🐙", text: "It was old before the sea." },
  { id: "gust-sparrow", name: "Gust Sparrow", sigil: "gale", kind: "creature", cost: 1, atk: 2, hp: 1, ability: "swift", art: "🐦", text: "First to every storm." },
  { id: "mist-dancer", name: "Mist Dancer", sigil: "gale", kind: "creature", cost: 2, atk: 3, hp: 2, ability: "surge", art: "🌀", text: "You cannot hit weather." },
  { id: "sky-lancer", name: "Sky Lancer", sigil: "gale", kind: "creature", cost: 4, atk: 4, hp: 3, ability: "swift", art: "🪶", text: "It arrives before the sound." },
  { id: "tempest-roc", name: "Tempest Roc", sigil: "gale", kind: "creature", cost: 6, atk: 6, hp: 4, ability: "drain", art: "🦉", text: "The sky keeps its tithe." },
  { id: "pebble-golem", name: "Pebble Golem", sigil: "stone", kind: "creature", cost: 2, atk: 1, hp: 4, ability: "guard", art: "🗿", text: "Patient as bedrock." },
  { id: "quarry-titan", name: "Quarry Titan", sigil: "stone", kind: "creature", cost: 5, atk: 4, hp: 6, ability: "guard", art: "⛰️", text: "It carries the hill it came from." },
  { id: "crystal-stag", name: "Crystal Stag", sigil: "stone", kind: "creature", cost: 4, atk: 3, hp: 4, ability: "shield", art: "🦌", text: "Antlered light, walking." },
  { id: "world-tortoise", name: "World Tortoise", sigil: "stone", kind: "creature", cost: 8, atk: 6, hp: 9, ability: "drain", art: "🐢", text: "Everything rests on it." },
  { id: "kindle-bolt", name: "Kindle Bolt", sigil: "ember", kind: "spell", cost: 2, effect: "damage3", art: "☄️", text: "Deal 3 damage to any creature or hero." },
  { id: "healing-rain", name: "Healing Rain", sigil: "tide", kind: "spell", cost: 2, effect: "heal4", art: "🌧️", text: "Restore 4 life to your hero." },
  { id: "second-wind", name: "Second Wind", sigil: "gale", kind: "spell", cost: 1, effect: "draw2", art: "💨", text: "Draw 2 cards." },
  { id: "stone-skin", name: "Stone Skin", sigil: "stone", kind: "spell", cost: 2, effect: "buff22", art: "🛡️", text: "Give a friendly creature +2/+2." },
  { id: "ember-surge", name: "Ember Surge", sigil: "ember", kind: "spell", cost: 3, effect: "buff30", art: "🔆", text: "Give a friendly creature +3 Attack." },
  { id: "tidal-wave", name: "Tidal Wave", sigil: "tide", kind: "spell", cost: 4, effect: "wave2", art: "🌊", text: "Deal 2 damage to all enemy creatures." },
];

export function cardById(id) {
  return CARD_POOL.find((c) => c.id === id);
}

// A 24-card deck: two copies of most cards, one copy of the biggest.
export function buildDeck(rng) {
  const ids = [];
  for (const c of CARD_POOL) {
    ids.push(c.id);
    if (c.cost <= 5) ids.push(c.id);
  }
  return shuffle(ids.slice(0, 24), rng);
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic PRNG so screenshot states and tests are reproducible.
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
