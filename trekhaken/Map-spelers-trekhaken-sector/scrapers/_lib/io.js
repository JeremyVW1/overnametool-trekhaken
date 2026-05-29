/**
 * io.js — JSON-bestanden lezen/schrijven met atomische write + caching.
 * Alle scrapers schrijven hun output naar data/_bron-cache/{bron}__{datum}.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CACHE_DIR } from "./config.js";

/** Schrijf JSON atomisch (write naar .tmp, dan rename) */
export function writeJson(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = filePath + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, filePath);
}

/** Lees JSON; geef defaultValue terug als bestand niet bestaat of corrupt is */
export function readJson(filePath, defaultValue = null) {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return defaultValue;
  }
}

/** Standaard cache-pad voor een bron */
export function cachePath(bronId) {
  const date = new Date().toISOString().slice(0, 10);
  return resolve(CACHE_DIR, `${bronId}__${date}.json`);
}

/** Laatste cache-bestand voor een bron (bij hertest binnen 30d) */
export function latestCache(bronId, maxAgeDays = 30) {
  const { readdirSync, statSync } = require("node:fs");
  if (!existsSync(CACHE_DIR)) return null;
  const files = readdirSync(CACHE_DIR)
    .filter(f => f.startsWith(`${bronId}__`) && f.endsWith(".json"))
    .map(f => ({
      f,
      path: resolve(CACHE_DIR, f),
      mtime: statSync(resolve(CACHE_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) return null;
  const ageDays = (Date.now() - files[0].mtime) / 86400000;
  if (ageDays > maxAgeDays) return null;
  return files[0].path;
}
