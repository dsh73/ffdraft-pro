import type { Player, Position, WaiverCandidate, WaiverSuggestion } from '../types';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

/**
 * For each position, compares your weakest rostered player against the best
 * available waiver-pool player at that position. Flags a suggestion whenever
 * the waiver player would be an upgrade (or you have nobody at that position
 * at all). This is a simple "is there a clear upgrade" check — it does not
 * account for weekly matchups, roster construction trade-offs across
 * positions, or bye-week overlap with your current starter.
 */
export function computeWaiverSuggestions(myPlayers: Player[], waiverPool: WaiverCandidate[]): WaiverSuggestion[] {
  const suggestions: WaiverSuggestion[] = [];

  for (const pos of POSITIONS) {
    const myWorst = myPlayers
      .filter(p => p.pos === pos)
      .sort((a, b) => a.proj - b.proj)[0] ?? null;
    const bestAvail = waiverPool
      .filter(p => p.pos === pos)
      .sort((a, b) => b.proj - a.proj)[0];

    if (bestAvail && (!myWorst || bestAvail.proj > myWorst.proj)) {
      suggestions.push({
        pos,
        add: bestAvail,
        drop: myWorst,
        gain: myWorst ? Math.round((bestAvail.proj - myWorst.proj) * 10) / 10 : bestAvail.proj,
      });
    }
  }

  return suggestions;
}
