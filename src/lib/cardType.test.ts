import { describe, it, expect } from 'vitest';
import { classifyCardType } from './cardType';

describe('classifyCardType', () => {
  it('detects Al Fursan Infinity (with various separators)', () => {
    expect(classifyCardType('Amex_Al Fursan Infinity_SC Direct_KSA_EN_Leads')).toBe('fursan_infinity');
    expect(classifyCardType('Amex_Fursan Infinity_Meta_UAE_AR_Conversions')).toBe('fursan_infinity');
    expect(classifyCardType('Al-Fursan-Infinity Platinum Acquisition')).toBe('fursan_infinity');
    expect(classifyCardType('Amex_Al_Fursan_Infinity_KSA')).toBe('fursan_infinity');
  });

  it('detects Platinum', () => {
    expect(classifyCardType('Amex_Platinum_SC Direct_KSA_EN_Leads')).toBe('platinum');
    expect(classifyCardType('Platinum Acquisition Q4')).toBe('platinum');
    expect(classifyCardType('amex_platinum_meta_uae')).toBe('platinum');
  });

  it('detects Other for known tokens (not Platinum / Fursan Infinity)', () => {
    expect(classifyCardType('Amex_Gold_SC Direct_KSA_EN_Leads')).toBe('other');
    expect(classifyCardType('Amex_Green_Meta_UAE')).toBe('other');
    expect(classifyCardType('Amex_Centurion_X_KSA')).toBe('other');
    expect(classifyCardType('Amex_Al Fursan_Meta_UAE')).toBe('other'); // plain Fursan, no Infinity
    expect(classifyCardType('Cashback Q3 Push')).toBe('other');
  });

  it('falls back to Unknown when no token matches', () => {
    expect(classifyCardType('MGM Q1 Awareness')).toBe('unknown');
    expect(classifyCardType('')).toBe('unknown');
    expect(classifyCardType(null)).toBe('unknown');
    expect(classifyCardType(undefined)).toBe('unknown');
  });

  it('does not false-match substrings (e.g. "Goldman" should not be Gold)', () => {
    // Word-boundary regex: a token inside a longer word shouldn't match.
    expect(classifyCardType('Goldman_Sachs_Brand')).toBe('unknown');
    expect(classifyCardType('Plate_Recognition_Test')).toBe('unknown');
  });
});
