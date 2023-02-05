export function millisecondsUntilMidnight(timestamp: number) {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return (midnight.getTime() - new Date(timestamp).getTime()) / 1000 / 60;
}

export function msToHours(ms: number) {
  return ms / 1000 / 60 / 60;
}

export function hoursToMs(hours: number) {
  return hours * 60 * 60 * 1000;
}
