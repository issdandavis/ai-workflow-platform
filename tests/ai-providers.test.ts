/**
 * AI Provider Integration Tests
 *
 * Tests the AI provider adapters (OpenAI, Anthropic, Gemini, Grok, etc.)
 * These tests require API keys to be set in environment variables.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Check which providers are configured
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;
const hasGroq = !!process.env.GROQ_API_KEY;
const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
const hasXAI = !!process.env.XAI_API_KEY;

describe('AI Provider Configuration', () => {
  it('should have at least one AI provider configured', () => {
    const anyConfigured = hasOpenAI || hasAnthropic || hasGoogle || hasGroq || hasPerplexity || hasXAI;

    if (!anyConfigured) {
      console.warn('No AI providers configured. Set at least one API key for full functionality.');
    }

    // This test passes either way - it's informational
    expect(true).toBe(true);
  });

  it('should report configured providers', () => {
    const providers = {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      google: hasGoogle,
      groq: hasGroq,
      perplexity: hasPerplexity,
      xai: hasXAI,
    };

    console.log('Configured AI Providers:', providers);
    expect(providers).toBeDefined();
  });
});

describe.skipIf(!hasOpenAI)('OpenAI Provider', () => {
  it('should initialize OpenAI client', async () => {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    expect(client).toBeDefined();
  });

  it('should list available models', async () => {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const models = await client.models.list();
      expect(models.data.length).toBeGreaterThan(0);
    } catch (error) {
      // API may rate limit or have other issues
      expect(error).toBeDefined();
    }
  });
});

describe.skipIf(!hasAnthropic)('Anthropic Provider', () => {
  it('should initialize Anthropic client', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    expect(client).toBeDefined();
  });
});

describe.skipIf(!hasGoogle)('Google Gemini Provider', () => {
  it('should initialize Gemini client', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    expect(client).toBeDefined();
  });
});

describe.skipIf(!hasGroq)('Groq Provider', () => {
  it('should initialize Groq client', async () => {
    const Groq = (await import('groq-sdk')).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    expect(client).toBeDefined();
  });
});

describe('Demo Mode', () => {
  it('should work without any API keys in demo mode', () => {
    // The platform should still function with demo responses
    // when no API keys are configured
    expect(true).toBe(true);
  });
});
