// Prices are stored as integer cents in the DB to avoid floating-point rounding bugs.
// These helpers convert between that and what a human types/sees.

export function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function displayToCents(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}