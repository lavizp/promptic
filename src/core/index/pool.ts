/**
 * Runs `worker` over `items` with at most `limit` in flight, preserving input
 * order in the result. A rejection is captured as an error result rather than
 * cancelling the rest — one bad note must not abort a whole reindex.
 */
export type PoolResult<R> =
  | { ok: true; value: R }
  | { ok: false; error: unknown };

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PoolResult<R>[]> {
  const results = new Array<PoolResult<R>>(items.length);
  if (items.length === 0) return results;

  const width = Math.max(1, Math.min(limit, items.length));
  let next = 0;

  async function run(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      try {
        results[index] = { ok: true, value: await worker(items[index]!, index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }

  await Promise.all(Array.from({ length: width }, run));
  return results;
}

/** Rejects with a labelled error if `promise` outlives `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** True for errors that are worth trying again — rate limits and 5xx. */
export function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /rate[- ]?limit|\b429\b|\b5\d\d\b|timed out|ETIMEDOUT|ECONNRESET/i.test(message);
}

/**
 * Retries `attempt` on transient failures with exponential backoff and jitter.
 *
 * Rate limits are the common case when indexing several notes at once: the
 * request would succeed a second later, so giving up immediately and writing a
 * degraded heuristic summary throws away work for no reason.
 */
export async function withRetry<T>(
  attempt: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 1_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));

  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (i === retries || !isRetryable(error)) throw error;
      // Jitter so parallel workers do not all retry on the same tick.
      await sleep(baseMs * 2 ** i + Math.floor(Math.random() * 250));
    }
  }
  throw lastError;
}
