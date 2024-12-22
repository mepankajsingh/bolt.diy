import React from 'react';
import { ModelUsageCard } from '~/components/ui/ModelUsageCard';
import { CostBreakdownCard } from '~/components/ui/CostBreakdownCard';
import { TotalCostCard } from '~/components/ui/TotalCostCard';
import type { ModelUsage } from '~/types/token-usage';

interface TokenUsageTabProps {
  usage: ModelUsage;
  totalTokens: number;
  showTitle: boolean;
  chatTitle?: string;
}

function TokenUsageTab({ usage, totalTokens, showTitle, chatTitle }: TokenUsageTabProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {showTitle && (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Token Usage Statistics</h2>
          {chatTitle && <p className="text-sm text-bolt-elements-textSecondary">Chat: {chatTitle}</p>}
        </div>
      )}
      <TotalCostCard usage={usage} />
      <ModelUsageCard usage={usage} totalTokens={totalTokens} />
      <div className="mt-2">
        <h3 className="mb-2 text-md font-medium">Cost Breakdown</h3>
        <CostBreakdownCard usage={usage} />
      </div>
    </div>
  );
}

export default TokenUsageTab;
