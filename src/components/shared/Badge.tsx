import type { Position } from '../../types';

export function Badge({ pos }: { pos: Position }) {
  return <span className={`badge ${pos}`}>{pos}</span>;
}
