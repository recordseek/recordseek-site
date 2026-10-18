/** Round down to the nearest thousand and add a "+": 2142018 -> "2,142,000+". */
export function formatStat(n: number): string {
  const floored = Math.floor(Math.max(0, n) / 1000) * 1000;
  return `${floored.toLocaleString('en-US')}+`;
}
