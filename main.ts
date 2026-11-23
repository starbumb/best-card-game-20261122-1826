// EMBERFALL hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ folders to the output
// directory (/output in the grader, $MAKEFUN_OUTPUT_DIR locally) and writes
// dossier.json there using buildDossier from the vendored make.fun library.
// The caps mirror the scorer's gate so a local run fails exactly where the
// gate would: at most 4 screenshots of 256 KiB, at most 993 game entries,
// 48 MiB of game files, game paths of at most 1000 bytes, and a dossier
// text of at most 163840 bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, "game"), join(outputDir, "game"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
const shotsDir = join(repoRoot, "screenshots");
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
