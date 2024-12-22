import type { ProviderPricing, PricingMetadata } from './types';

export const openaiMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'OpenAI models pricing',
};

export const openaiPricing: ProviderPricing = {
  'gpt-4-turbo-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4-0125-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4-1106-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4': {
    prompt: 0.03,
    completion: 0.06,
  },
  'gpt-4-0613': {
    prompt: 0.03,
    completion: 0.06,
  },
  'gpt-3.5-turbo': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'gpt-3.5-turbo-0125': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'gpt-3.5-turbo-1106': {
    prompt: 0.0005,
    completion: 0.0015,
  },
} as const;
