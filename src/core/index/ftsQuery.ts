/**
 * Builds an FTS5 MATCH expression from free-form user or model text.
 *
 * This is the highest-risk pure function in the index: FTS5 treats `"`, `*`,
 * `(`, `)`, `:`, `-`, `AND`, `OR`, `NOT` and `NEAR` as syntax, so passing a raw
 * question through would throw `fts5: syntax error` on perfectly ordinary input
 * like `what's left today?` or `notes re: the API rewrite`. Everything is
 * reduced to bare terms and recombined explicitly.
 */

const FTS_KEYWORDS = new Set(['and', 'or', 'not', 'near']);

/** Words that carry no retrieval signal in a question-shaped query. */
const QUERY_STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'me', 'i', 'is', 'are', 'was', 'were', 'do', 'does', 'did',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'show', 'find', 'get', 'tell',
  'about', 'from', 'for', 'of', 'on', 'in', 'to', 'with', 'and', 'or', 'any', 'all',
  'have', 'has', 'had', 'it', 'that', 'this', 'these', 'those', 'please', 'can', 'you',
]);

/** Splits into bare alphanumeric terms, discarding every FTS5 operator. */
export function tokenize(input: string): string[] {
  return (input.toLowerCase().match(/[a-z0-9][a-z0-9']*/g) ?? [])
    .map(token => token.replace(/'+$/, ''))
    .filter(token => token.length > 1);
}

/**
 * Returns a MATCH expression, or null when nothing searchable is left — the
 * caller must then fall back to a non-FTS listing rather than run `MATCH ''`.
 *
 * Terms are OR-ed with a prefix wildcard so "lens" finds "lenses" alongside the
 * porter stemmer, and rare terms still rank via bm25 rather than being required.
 */
export function buildFtsQuery(input: string): string | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;

  const meaningful = tokens.filter(t => !QUERY_STOPWORDS.has(t) && !FTS_KEYWORDS.has(t));
  // An all-stopword query ("what is it") still beats returning nothing.
  const terms = (meaningful.length > 0 ? meaningful : tokens).slice(0, 16);

  const unique = [...new Set(terms)];
  // Quote each term so a stray apostrophe or reserved word cannot escape into
  // the grammar, then append `*` outside the quotes for prefix matching.
  return unique.map(term => `"${term.replace(/"/g, '')}"*`).join(' OR ');
}
