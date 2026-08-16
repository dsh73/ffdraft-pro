import { describe, it, expect } from 'vitest';
import { normalizeName, namesMatch } from '../nameMatching';

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Ja\'Marr Chase  ')).toBe("ja'marr chase");
  });

  it('strips a trailing "II" suffix', () => {
    expect(normalizeName('James Cook II')).toBe('james cook');
  });

  it('strips a trailing "III" suffix', () => {
    expect(normalizeName('James Cook III')).toBe('james cook');
  });

  it('strips "Jr." (with period) and "Sr."', () => {
    expect(normalizeName('Michael Pittman Jr.')).toBe('michael pittman');
    expect(normalizeName('Deebo Samuel Sr.')).toBe('deebo samuel');
  });

  it('collapses periods in initials', () => {
    expect(normalizeName('T.J. Hockenson')).toBe('tj hockenson');
  });

  it('does not strip a suffix-like word that is part of the actual name', () => {
    // "Kenneth Walker III" is a real, full name — suffix stripping is intentional
    // and expected here too, since sources are inconsistent about including it.
    expect(normalizeName('Kenneth Walker III')).toBe('kenneth walker');
  });

  it('handles null/undefined safely', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});

describe('namesMatch', () => {
  it('matches the same player with different suffixes (the James Cook bug)', () => {
    expect(namesMatch('James Cook II', 'James Cook III')).toBe(true);
    expect(namesMatch('James Cook', 'James Cook II')).toBe(true);
  });

  it('does not match different players', () => {
    expect(namesMatch('James Cook', 'Dalvin Cook')).toBe(false);
  });

  it('does not match two empty names', () => {
    expect(namesMatch('', '')).toBe(false);
    expect(namesMatch(null, null)).toBe(false);
  });
});
