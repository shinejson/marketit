/** A value that can appear in an exported CSV row. */
export type CsvCell = string | number | null | undefined;

/**
 * Text that starts with a formula trigger would be evaluated by spreadsheet
 * apps when a CSV is opened (CSV injection). Prefix those cells with an
 * apostrophe so the value stays literal.
 */
export function csvSafe(cell: CsvCell): string {
  // Numbers cannot carry a formula, so only text cells need guarding.
  if (typeof cell === 'number') return String(cell);
  const text = String(cell ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Serialises rows to CSV with every cell quoted and formula-safe. */
export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${csvSafe(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
