import { describe, it, expect } from 'vitest';
import { isRetryable, mapWithConcurrency, withRetry, withTimeout } from './pool.js';

const tick = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
      await tick(ms);
      return ms;
    });
    expect(results.map(r => (r.ok ? r.value : null))).toEqual([30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick(5);
      inFlight--;
      return true;
    });
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('captures a rejection without cancelling the rest', async () => {
    // One malformed note must not abort a whole reindex.
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });
    expect(results[0]).toEqual({ ok: true, value: 1 });
    expect(results[1]!.ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 3 });
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });
});

describe('withTimeout', () => {
  it('resolves when the promise wins', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50, 'x')).resolves.toBe('ok');
  });

  it('rejects with a labelled error when it does not', async () => {
    await expect(withTimeout(tick(50), 10, 'enrichment')).rejects.toThrow(/enrichment timed out/);
  });
});

describe('isRetryable', () => {
  it('flags rate limits, 5xx and timeouts', () => {
    expect(isRetryable(new Error('Groq is rate-limiting you'))).toBe(true);
    expect(isRetryable(new Error('429 Too Many Requests'))).toBe(true);
    expect(isRetryable(new Error('503 Service Unavailable'))).toBe(true);
    expect(isRetryable(new Error('enrichment timed out after 45000ms'))).toBe(true);
  });

  it('does not flag permanent failures', () => {
    expect(isRetryable(new Error('401 invalid api key'))).toBe(false);
    expect(isRetryable(new Error('enrichment returned no usable JSON'))).toBe(false);
  });
});

describe('withRetry', () => {
  const noSleep = async () => {};

  it('returns the first success without retrying', async () => {
    let calls = 0;
    const value = await withRetry(async () => { calls++; return 'ok'; }, { sleep: noSleep });
    expect(value).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries a rate limit and succeeds', async () => {
    let calls = 0;
    const value = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error('429 rate limit');
      return 'recovered';
    }, { sleep: noSleep });
    expect(value).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('gives up after the retry budget', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error('429 rate limit'); },
      { retries: 2, sleep: noSleep })).rejects.toThrow(/rate limit/);
    expect(calls).toBe(3);
  });

  it('does not retry a permanent error', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error('401 invalid api key'); },
      { sleep: noSleep })).rejects.toThrow(/401/);
    expect(calls).toBe(1);
  });
});
