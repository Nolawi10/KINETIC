import { describe, expect, it } from 'vitest';
import { getPreset, filterPresets, csvCell } from '@/lib/coaching-presets';
describe('coaching preset contracts', () => {
  it('uses 1.5s guard tolerance, strict penalties and three-minute rounds', () => { expect(getPreset('guard')).toMatchObject({ guardTolerance: 1.5, penalty: 'Strict', roundSeconds: 180 }); });
  it('uses five strikes, 0.35s debounce and 120 strikes per round', () => { expect(getPreset('combo')).toMatchObject({ minimumCombo: 5, debounceSeconds: 0.35, targetStrikes: 120 }); });
  it('targets knee extension of 155–170 degrees with hip checks', () => { expect(getPreset('stance')).toMatchObject({ kneeMin: 155, kneeMax: 170, hipCheck: true }); });
  it('keeps full telemetry and multi-foul tracking without logging interruptions', () => { expect(getPreset('sparring')).toMatchObject({ fullTelemetry: true, multiFoul: true, uninterruptedLogging: true }); });
  it('filters coaching categories and rejects unknown preset IDs', () => { expect(filterPresets('Defensive').map(p => p.id)).toEqual(['guard']); expect(filterPresets('Offensive').map(p => p.id)).toEqual(['combo','sparring']); expect(filterPresets('Biomechanics').map(p => p.id)).toEqual(['stance']); expect(getPreset('unknown')).toBeUndefined(); });
  it('escapes CSV data and blocks spreadsheet formulas', () => { expect(csvCell('a,"b"')).toBe('"a,""b"""'); expect(csvCell('=1+1')).toBe('"\'=1+1"'); });
});