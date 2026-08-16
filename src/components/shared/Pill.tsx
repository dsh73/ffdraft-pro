import type { ReactNode, CSSProperties } from 'react';

export function Pill({ children, tone }: { children: ReactNode; tone?: 'red' | 'green' }) {
  const style: CSSProperties | undefined = tone
    ? { color: tone === 'red' ? 'var(--red)' : 'var(--green)', borderColor: tone === 'red' ? 'var(--red)' : 'var(--green)' }
    : undefined;
  return <span className="pill" style={style}>{children}</span>;
}
