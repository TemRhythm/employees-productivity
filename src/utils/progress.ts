export function getPercentage(count: number, total: number): number {
  return Math.ceil((count++ / total) * 100);
}
