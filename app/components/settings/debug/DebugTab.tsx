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

interface SystemInfo {
  version: string;
  platform: string;
  arch: string;
}

interface ProviderStatus {
  [key: string]: {
    status: 'online' | 'offline' | 'error';
    message?: string;
  };
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

const fetchSystemInfo = async (): Promise<SystemInfo | null> => {
  try {
    const response = await fetch('/api/system/info');

    if (!response.ok) {
      throw new Error('Failed to fetch system info');
    }

    const data = await response.json();

    if (!isSystemInfo(data)) {
      console.error('Invalid system info format:', data);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching system info:', error);
    return null;
  }
};

const fetchProviderStatus = async (): Promise<ProviderStatus> => {
  try {
    const response = await fetch('/api/providers/status');

    if (!response.ok) {
      throw new Error('Failed to fetch provider status');
    }

    const data = await response.json();

    if (!isProviderStatus(data)) {
      console.error('Invalid provider status format:', data);
      return {};
    }

    return data;
  } catch (error) {
    console.error('Error fetching provider status:', error);
    return {};
  }
};

// Type guard for SystemInfo
function isSystemInfo(data: unknown): data is SystemInfo {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    typeof data.version === 'string' &&
    'platform' in data &&
    typeof data.platform === 'string' &&
    'arch' in data &&
    typeof data.arch === 'string'
  );
}

// Type guard for ProviderStatus
function isProviderStatus(data: unknown): data is ProviderStatus {
  return (
    typeof data === 'object' &&
    data !== null &&
    Object.entries(data).every(([_, value]) => {
      return (
        typeof value === 'object' &&
        value !== null &&
        'status' in value &&
        (value.status === 'online' || value.status === 'offline' || value.status === 'error') &&
        (!('message' in value) || typeof value.message === 'string')
      );
    })
  );
}

export default function DebugTab() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({});
  const [activePR, setActivePR] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPullRequests().then(setPullRequests);
    fetchSystemInfo().then(setSystemInfo);
    fetchProviderStatus().then(setProviderStatus);
  }, []);

  const handlePRCheckout = async (prNumber: number) => {
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handleResetToMain = async () => {
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* System Info Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">System Info</h3>
          <button
            onClick={() => fetchSystemInfo().then(setSystemInfo)}
            className="text-sm px-3 py-1 text-blue-500 hover:text-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
        {systemInfo ? (
          <div className="space-y-2">
            <div>Version: {systemInfo.version}</div>
            <div>Platform: {systemInfo.platform}</div>
            <div>Architecture: {systemInfo.arch}</div>
          </div>
        ) : (
          <div>Failed to fetch system information</div>
        )}
      </div>

      {/* Provider Status Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Provider Status</h3>
          <button
            onClick={() => fetchProviderStatus().then(setProviderStatus)}
            className="text-sm px-3 py-1 text-blue-500 hover:text-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(providerStatus).length > 0 ? (
            Object.entries(providerStatus).map(([provider, status]) => (
              <div key={provider} className="flex items-center space-x-2">
                <span>{provider}:</span>
                <span
                  className={`px-2 py-0.5 rounded text-sm ${
                    status.status === 'online'
                      ? 'bg-green-100 text-green-800'
                      : status.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {status.status}
                </span>
                {status.message && <span className="text-sm text-gray-500">{status.message}</span>}
              </div>
            ))
          ) : (
            <div>No provider status available</div>
          )}
        </div>
      </div>

      {/* Pull Requests Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pull Requests</h3>
          <button
            onClick={() => fetchPullRequests().then(setPullRequests)}
            className="text-sm px-3 py-1 text-blue-500 hover:text-blue-600 transition-colors"
          >
            Refresh PRs
          </button>
        </div>
        <div className="space-y-3">
          {pullRequests.map((pr) => (
            <div
              key={pr.number}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-grow mb-3 sm:mb-0">
                <div className="font-medium text-gray-900 dark:text-gray-100">{pr.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  #{pr.number} by {(pr.user || pr.author)?.login} • {new Date(pr.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activePR === pr.number
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  onClick={() => handlePRCheckout(pr.number)}
                  disabled={activePR === pr.number || isLoading}
                >
                  Test PR
                </button>
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 text-sm font-medium bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          ))}
          {pullRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
              No pull requests available
            </div>
          )}
        </div>
        {activePR && (
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleResetToMain}
              disabled={isLoading}
            >
              Reset to Main
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
