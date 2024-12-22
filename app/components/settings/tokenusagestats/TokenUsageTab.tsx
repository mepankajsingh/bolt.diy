import React from 'react';
import { ModelUsageCard } from '~/components/ui/ModelUsageCard';
import type { ModelUsage } from '~/types/token-usage';
import { getModelPrice } from '~/lib/costs';

interface TokenUsageTabProps {
  usage: ModelUsage;
  totalTokens: number;
  showTitle: boolean;
}

function calculateCost(usage: ModelUsage): number {
  const pricing = getModelPrice(usage.provider, usage.model);

  if (!pricing) {
    return 0;
  }

  const promptCost = (usage.promptTokens * pricing.prompt) / 1000;
  const completionCost = (usage.completionTokens * pricing.completion) / 1000;

  return promptCost + completionCost;
}

function TokenUsageTab({ usage, totalTokens, showTitle }: TokenUsageTabProps) {
  const cost = calculateCost(usage);

  return (
    <div className="flex flex-col gap-4 p-4">
      {showTitle && (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Token Usage Statistics</h2>
          <p className="text-sm text-bolt-elements-textSecondary">Cost: ${cost.toFixed(4)}</p>
        </div>
      )}
      <ModelUsageCard usage={usage} totalTokens={totalTokens} />
    </div>
  );
}

export default TokenUsageTab;
