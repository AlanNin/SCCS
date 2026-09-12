import { describe, expect, it } from 'vitest';
import { riskBand } from './risk-band.js';

describe('riskBand', () => {
  it('classifies 0 as low', () => {
    expect(riskBand(0)).toBe('low');
  });

  it('classifies just under the low/medium boundary as low', () => {
    expect(riskBand(33)).toBe('low');
  });

  it('classifies the low/medium boundary as medium', () => {
    expect(riskBand(34)).toBe('medium');
  });

  it('classifies just under the medium/high boundary as medium', () => {
    expect(riskBand(66)).toBe('medium');
  });

  it('classifies the medium/high boundary as high', () => {
    expect(riskBand(67)).toBe('high');
  });

  it('classifies 100 as high', () => {
    expect(riskBand(100)).toBe('high');
  });
});
