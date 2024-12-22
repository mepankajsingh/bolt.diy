export * from './types';

import { anthropicPricing, anthropicMetadata } from './anthropic';
import { openaiPricing, openaiMetadata } from './openai';
import { googlePricing, googleMetadata } from './google';
import { mistralPricing, mistralMetadata } from './mistral';
import { coherePricing, cohereMetadata } from './cohere';
import { openrouterPricing, openrouterMetadata } from './openrouter';
import { groqPricing, groqMetadata } from './groq';
import { xiaPricing, xiaMetadata } from './xia';
import type { ProviderPricing, PricingMetadata } from './types';

export {
  anthropicPricing,
  openaiPricing,
  googlePricing,
  mistralPricing,
  coherePricing,
  openrouterPricing,
  groqPricing,
  xiaPricing,
};

export const providerMetadata: Record<string, PricingMetadata> = {
  Anthropic: anthropicMetadata,
  OpenAI: openaiMetadata,
  Google: googleMetadata,
  Mistral: mistralMetadata,
  Cohere: cohereMetadata,
  OpenRouter: openrouterMetadata,
  Groq: groqMetadata,
  XAI: xiaMetadata,
} as const;

export const allProviderPricing: Record<string, ProviderPricing> = {
  Anthropic: anthropicPricing,
  OpenAI: openaiPricing,
  Google: googlePricing,
  Mistral: mistralPricing,
  Cohere: coherePricing,
  OpenRouter: openrouterPricing,
  Groq: groqPricing,
  XAI: xiaPricing,
} as const;

// Providers that need prefix matching due to version suffixes
const PREFIX_MATCHING_PROVIDERS = new Set(['Google', 'Groq', 'XAI']);

function findMatchingModel(provider: string, pricing: ProviderPricing, model: string): string | undefined {
  // First try exact match
  if (pricing[model]) {
    return model;
  }

  // Try to match model by normalizing the name
  const modelKeys = Object.keys(pricing);

  // Convert model name to lowercase and remove special characters for comparison
  const normalizedSearchModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Find a matching model by comparing normalized names
  const matchingModel = modelKeys.find((key) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedKey.includes(normalizedSearchModel) || normalizedSearchModel.includes(normalizedKey);
  });

  if (matchingModel) {
    return matchingModel;
  }

  // Handle provider aliases (e.g., "X-AI" might come as "XAI")
  const normalizedProvider = provider.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const isPrefix = PREFIX_MATCHING_PROVIDERS.has(provider) || PREFIX_MATCHING_PROVIDERS.has(normalizedProvider);

  // Only do prefix matching for specific providers
  if (isPrefix) {
    return modelKeys.find((key) => key.startsWith(model));
  }

  return undefined;
}

export function getModelPrice(provider: string, model: string) {
  // Normalize provider name
  const normalizedProvider = provider.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Try both original and normalized provider names
  const pricing = allProviderPricing[provider] || allProviderPricing[normalizedProvider];

  if (!pricing) {
    console.warn(`No pricing found for provider ${provider} (normalized: ${normalizedProvider})`);
    return undefined;
  }

  const matchingModel = findMatchingModel(provider, pricing, model);

  if (!matchingModel) {
    console.warn(`No matching model found for ${model} in provider ${provider}`);
  }

  return matchingModel ? pricing[matchingModel] : undefined;
}
