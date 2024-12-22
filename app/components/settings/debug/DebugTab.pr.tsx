import { useState, useEffect } from 'react';

interface PullRequest {
  number: number;
  title: string;
  head: {
    ref: string;
    sha: string;
  };
  user?: {
    login: string;
  };
  author?: {
    login: string;
  };
  html_url: string;
  created_at: string;
}

const fetchPullRequests = async (): Promise<PullRequest[]> => {
  try {
    const response = await fetch('/api/git/pull-requests');

    if (!response.ok) {
      throw new Error('Failed to fetch PRs');
    }

    const data = await response.json();
    console.log('GitHub PR Response:', data);

    // Type guard function to validate PR data
    function isPullRequestArray(data: unknown): data is PullRequest[] {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            'number' in item &&
            typeof item.number === 'number' &&
            'title' in item &&
            typeof item.title === 'string' &&
            'head' in item &&
            typeof item.head === 'object' &&
            item.head !== null &&
            'ref' in item.head &&
            typeof item.head.ref === 'string' &&
            'sha' in item.head &&
            typeof item.head.sha === 'string' &&
            'html_url' in item &&
            typeof item.html_url === 'string' &&
            'created_at' in item &&
            typeof item.created_at === 'string' &&
            (('user' in item && (item.user === null || (typeof item.user === 'object' && 'login' in item.user))) ||
              ('author' in item &&
                (item.author === null || (typeof item.author === 'object' && 'login' in item.author)))),
        )
      );
    }

    if (!isPullRequestArray(data)) {
      console.error('Invalid PR data format:', data);
      return [];
    }

    return data;
  } catch (error: unknown) {
    console.error('Error fetching PRs:', error);
    return [];
  }
};

export default function PullRequest() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePR, setActivePR] = useState<number | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const loadPullRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const prs = await fetchPullRequests();
      setPullRequests(prs);
    } catch (err) {
      setError('Failed to load pull requests');
      console.error('Error loading PRs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePRCheckout = async (prNumber: number) => {
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/git/checkout-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to checkout PR');
      }

      setActivePR(prNumber);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleResetToMain = async () => {
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/git/reset-main', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset to main');
      }

      setActivePR(null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    loadPullRequests();
  }, []);

  if (isLoading) {
    return <div className="text-bolt-elements-textSecondary">Loading pull requests...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error}
        <button onClick={loadPullRequests} className="ml-2 text-bolt-elements-button-primary-text hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return <div className="text-bolt-elements-textSecondary">No pull requests found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Pull Requests</h3>
        <button onClick={loadPullRequests} className="text-sm text-bolt-elements-button-primary-text hover:underline">
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {pullRequests.map((pr) => (
          <a
            key={pr.number}
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg bg-bolt-elements-surface-hover hover:bg-bolt-elements-surface-hoverHover transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-bolt-elements-textPrimary font-medium">
                  #{pr.number} {pr.title}
                </h4>
                <p className="text-sm text-bolt-elements-textSecondary">
                  by {pr.user?.login || pr.author?.login || 'Unknown'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handlePRCheckout(pr.number);
                    }}
                    disabled={activePR === pr.number || isCheckingOut}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activePR === pr.number || isCheckingOut
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover'
                    }`}
                  >
                    {activePR === pr.number ? 'Active' : 'Test PR'}
                  </button>
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1 text-sm bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text rounded-md hover:bg-bolt-elements-button-secondary-backgroundHover transition-colors"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
              <span className="text-xs text-bolt-elements-textSecondary">
                {new Date(pr.created_at).toLocaleDateString()}
              </span>
            </div>
          </a>
        ))}
      </div>
      {activePR && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleResetToMain}
            disabled={isCheckingOut}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Reset to Main
          </button>
        </div>
      )}
    </div>
  );
}
