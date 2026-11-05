/**
 * A count followed by its noun in the right number: "1 unidad", "0 unidades", "3 unidades".
 * In Spanish only 1 takes the singular (0 takes the plural).
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
