/**
 * Normalizes a player name for cross-source matching.
 *
 * Different sources render the same player inconsistently — e.g. ESPN's
 * "James Cook II" vs. FantasyPros' "James Cook III". This strips generational
 * suffixes and punctuation so both normalize to the same key, without
 * discarding the original display name anywhere else in the app.
 */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\./g, '')                          // "T.J." -> "tj"
    .replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, '')   // strip trailing generational suffix
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if two raw names refer to the same player once normalized. */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length > 0 && na === nb;
}
