import type { CSSProperties } from 'react';
import { Square, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNow, useSensorSim } from '@/hooks/use-sensor-sim';
import { countersForFilter, formatClock } from '@/lib/sensor-sim/engine';
import { sensorSimStore } from '@/lib/sensor-sim/store';
import {
  DUMMY_ZONES,
  INTENSITY_LABELS,
  INTENSITY_LEVELS,
  type DummyZoneId,
} from '@/lib/sensor-sim/types';

/** Screen placement of each clickable zone over the front-facing silhouette. */
const ZONE_LAYOUT: Record<DummyZoneId, CSSProperties> = {
  HEAD: { left: '33%', top: '3%', width: '34%', height: '15%' },
  CHEST: { left: '28%', top: '20%', width: '44%', height: '22%' },
  LEFT_WAIST: { left: '24%', top: '43%', width: '26%', height: '14%' },
  RIGHT_WAIST: { left: '50%', top: '43%', width: '26%', height: '14%' },
};

function isActive(lastTs: number | undefined, now: number): boolean {
  return lastTs !== undefined && now > 0 && now - lastTs < 450;
}

const fmt = (value: number | undefined, digits = 2): string =>
  value === undefined ? '—' : value.toFixed(digits);

/** Panel B — four-zone dummy with MPU6050-style motion readout and combos. */