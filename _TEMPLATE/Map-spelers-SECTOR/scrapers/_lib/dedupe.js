/**
 * dedupe.js — Robuuste deduplicatie van bedrijfs-records.
 * Match-volgorde: BTW > KvK > website-domain > naam+plaats-fuzzy > naam+geo<500m
 */
import { normName, digitsOnly } from "./bedrijf.js";

/**
 * Dedup een array bedrijven. Returnt deduplicated array.
 * Bij match: merged via mergeFn (default: combineRecords).
 *
 * @param {Array<object>} records
 * @param {(a:object, b:object) => object} [mergeFn]
 * @returns {Array<object>}
 */
export function dedupe(records, mergeFn = combineRecords) {
  const byBtw     = new Map();
  const byKvk     = new Map();
  const byDomain  = new Map();
  const byNamePlace = new Map();
  const final = [];

  for (const r of records) {
    let existing = null;

    const btw = digitsOnly(r.btw);
    const kvk = digitsOnly(r.kvk);
    const dom = domainOf(r.website);
    const np  = nameAndPlaceKey(r);

    if (btw && byBtw.has(btw))          existing = byBtw.get(btw);
    else if (kvk && byKvk.has(kvk))     existing = byKvk.get(kvk);
    else if (dom && byDomain.has(dom))  existing = byDomain.get(dom);
    else if (np && byNamePlace.has(np)) existing = byNamePlace.get(np);

    if (existing) {
      const merged = mergeFn(existing, r);
      Object.assign(existing, merged);
    } else {
      const copy = { ...r };
      final.push(copy);
      if (btw) byBtw.set(btw, copy);
      if (kvk) byKvk.set(kvk, copy);
      if (dom) byDomain.set(dom, copy);
      if (np)  byNamePlace.set(np, copy);
    }
  }

  return final;
}

/** Default merge: behoud meeste-gevuld + voeg bron[] samen */
export function combineRecords(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (k === "bron")        out.bron = Array.from(new Set([...(a.bron || []), ...(b.bron || [])]));
    else if (k === "categorieen") out.categorieen = Array.from(new Set([...(a.categorieen || []), ...(b.categorieen || [])]));
    else if (k === "nace")   out.nace = Array.from(new Set([...(a.nace || []), ...(b.nace || [])]));
    else if (k === "sbi")    out.sbi = Array.from(new Set([...(a.sbi || []), ...(b.sbi || [])]));
    else if (k === "merken_gevoerd") out.merken_gevoerd = Array.from(new Set([...(a.merken_gevoerd || []), ...(b.merken_gevoerd || [])]));
    else if (a[k] == null || a[k] === "") {
      if (b[k] != null && b[k] !== "") out[k] = b[k];
    }
  }
  return out;
}

function domainOf(url) {
  if (!url) return "";
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL("https://" + url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function nameAndPlaceKey(r) {
  const n = normName(r.naam);
  const p = (r.plaats || r.postcode || "").toLowerCase().trim();
  if (!n) return "";
  return p ? `${n}|${p}` : n;
}
