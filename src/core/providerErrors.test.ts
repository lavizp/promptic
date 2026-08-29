import { describe, it, expect } from 'vitest';
import { describeProviderError } from './providerErrors.js';

describe('describeProviderError', () => {
  it('points a decommissioned model at the /config model picker', () => {
    // The exact error groq-sdk threw for llama-3.3-70b-versatile.
    const msg = describeProviderError(
      new Error('404 The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.'),
      'groq',
      'llama-3.3-70b-versatile',
    );
    expect(msg).toContain('llama-3.3-70b-versatile');
    expect(msg).toContain('decommissioned');
    expect(msg).toContain('/config');
  });

  it('names the provider-specific key on an auth failure', () => {
    expect(describeProviderError(new Error('401 Invalid API Key'), 'groq', 'm'))
      .toContain('GROQ_API_KEY');
    expect(describeProviderError(new Error('401 Invalid API Key'), 'anthropic', 'm'))
      .toContain('ANTHROPIC_API_KEY');
  });

  it('distinguishes rate limits, server errors and network failures', () => {
    expect(describeProviderError(new Error('429 rate limit reached'), 'openai', 'm'))
      .toMatch(/rate-limiting/);
    expect(describeProviderError(new Error('503 Service Unavailable'), 'openai', 'm'))
      .toMatch(/server error/);
    expect(describeProviderError(new Error('fetch failed'), 'openai', 'm'))
      .toMatch(/Could not reach/);
  });

  it('passes an unrecognized message through unchanged', () => {
    expect(describeProviderError(new Error('something odd'), 'gemini', 'm')).toBe('something odd');
  });

  it('handles non-Error throwables', () => {
    expect(describeProviderError('plain string', 'gemini', 'm')).toBe('plain string');
  });
});
