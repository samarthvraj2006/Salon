export function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type Interval = { start: number; end: number };

export function isBlocked(
  start: number,
  end: number,
  blocks: Interval[],
): boolean {
  return blocks.some((b) => rangesOverlap(start, end, b.start, b.end));
}

export function buildSlotTimes(
  openMin: number,
  closeMin: number,
  duration: number,
  interval: number,
): number[] {
  const times: number[] = [];
  for (let t = openMin; t + duration <= closeMin; t += interval) {
    times.push(t);
  }
  return times;
}

export function combineDateAndTime(dateStr: string, hm: string, tzOffsetMin = 330): Date {
  // Store as UTC representing IST wall clock for demo consistency
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) - tzOffsetMin * 60_000;
  return new Date(utc);
}
