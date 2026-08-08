export type ListRow<T> =
  | { kind: 'category'; name: string; count: number }
  | { kind: 'item'; item: T };

export function buildRows<T>(
  categories: string[],
  items: T[],
  getCategory: (item: T) => string
): ListRow<T>[] {
  const byCategory = new Map<string, T[]>();
  for (const item of items) {
    const key = getCategory(item);
    const list = byCategory.get(key);
    if (list) list.push(item);
    else byCategory.set(key, [item]);
  }

  const rows: ListRow<T>[] = [];
  for (const name of categories) {
    const list = byCategory.get(name) ?? [];
    rows.push({ kind: 'category', name, count: list.length });
    for (const item of list) rows.push({ kind: 'item', item });
  }
  return rows;
}
