import type { ProviderStatus } from './types';

export async function checkProviderStatus(): Promise<ProviderStatus> {
  try {
    const response = await fetch('/api/providers/status');

    if (!response.ok) {
      throw new Error('Failed to fetch provider status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking provider status:', error);
    return {};
  }
}
