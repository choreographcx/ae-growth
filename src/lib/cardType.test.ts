import { describe, it, expect } from 'vitest';
import { classifyCardType } from './cardType';

describe('classifyCardType', () => {
  it('detects AlFursan (canonical one-word and spaced variants)', () => {
    expect(classifyCardType('Amex_AlFursan_SC Direct_KSA_EN_Leads')).toBe('alfursan');
    expect(classifyCardType('Amex_Al Fursan_Meta_UAE_AR_Conversions')).toBe('alfursan');
    expect(classifyCardType('Al-Fursan Acquisition Q4')).toBe('alfursan');
    expect(classifyCardType('Amex_Al_Fursan_KSA')).toBe('alfursan');
    // Legacy naming still rolls up to AlFursan
    expect(classifyCardType('Amex_Al Fursan Infinity_KSA')).toBe('alfursan');
  });

  it('detects Platinum', () => {
    expect(classifyCardType('Amex_Platinum_SC Direct_KSA_EN_Leads')).toBe('platinum');
    expect(classifyCardType('Platinum Acquisition Q4')).toBe('platinum');
    expect(classifyCardType('amex_platinum_meta_uae')).toBe('platinum');
  });

  it('detects Other for known AMEX product tokens', () => {
    expect(classifyCardType('Amex_Gold_SC Direct_KSA_EN_Leads')).toBe('other');
    expect(classifyCardType('Amex_Green_Meta_UAE')).toBe('other');
    expect(classifyCardType('Amex_Blue_Meta_KSA')).toBe('other');
    expect(classifyCardType('Amex_Business_Search_KSA')).toBe('other');
    expect(classifyCardType('Amex_Marriott Bonvoy_Meta_KSA')).toBe('other');
    expect(classifyCardType('Amex_Centurion_X_KSA')).toBe('other');
  });

  it('falls back to Unknown when no token matches', () => {
    expect(classifyCardType('MGM Q1 Awareness')).toBe('unknown');
    expect(classifyCardType('')).toBe('unknown');
    expect(classifyCardType(null)).toBe('unknown');
    expect(classifyCardType(undefined)).toBe('unknown');
  });

  it('does not false-match substrings (word-boundary)', () => {
    expect(classifyCardType('Goldman_Sachs_Brand')).toBe('unknown');
    expect(classifyCardType('Plate_Recognition_Test')).toBe('unknown');
    expect(classifyCardType('Bluetooth_Promo')).toBe('unknown');
  });

  it('AlFursan takes priority over Platinum when both appear', () => {
    expect(classifyCardType('AlFursan Platinum Acquisition')).toBe('alfursan');
  });
});
