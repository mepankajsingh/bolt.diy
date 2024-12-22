import { memo } from 'react';

export const PullRequestTestingBanner = memo(() => (
  <div className="bg-red-500/10 px-4 py-2 flex items-center justify-center border-b border-red-500/20">
    <span className="text-red-500 font-medium flex items-center gap-2">
      <div className="i-ph:warning-circle-fill" />
      You are currently testing a PR - Changes made here are temporary
    </span>
  </div>
));
