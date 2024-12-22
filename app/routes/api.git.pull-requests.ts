import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const UPSTREAM_REPO = 'stackblitz-labs/bolt.diy';

interface GitHubPR {
  number: number;
  title: string;
  head: {
    ref: string;
    repo: {
      clone_url: string;
    };
  };
  html_url: string;
  created_at: string;
}

interface LocalPR {
  number: number;
  title: string;
  head: {
    ref: string;
    repo: {
      clone_url: string;
    };
  };
  html_url: string;
  created_at: string;
}

export const loader = async () => {
  try {
    // Get the GitHub repository URL
    const { stdout: remoteUrl } = await execAsync('git remote get-url origin');
    console.log('Remote URL:', remoteUrl);

    // We'll use the upstream repo for fetching PRs since it's a fork
    console.log('Using upstream repo:', UPSTREAM_REPO);

    // Fetch pull requests from GitHub API with expanded parameters
    const apiUrl = `https://api.github.com/repos/${UPSTREAM_REPO}/pulls?state=all&sort=updated&direction=desc&per_page=100`;
    console.log('API URL:', apiUrl);

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'BoltDIY-App',
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      }),
    };
    console.log('Headers:', { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined });

    const response = await fetch(apiUrl, { headers });
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);

      /*
       * If we get a 404, it means the repo is not found or private
       * Let's try to get the PR info from git directly
       */
      if (response.status === 404) {
        const { stdout: prList } = await execAsync('git branch -r | grep -i "pr-"');
        const prs: LocalPR[] = prList
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const match = line.match(/pr-(\d+)/i);
            return match
              ? {
                  number: parseInt(match[1], 10),
                  title: line.trim(),
                  head: {
                    ref: line.trim().replace(/^.*?\//, ''),
                    repo: {
                      clone_url: `https://github.com/${UPSTREAM_REPO}.git`,
                    },
                  },
                  html_url: `https://github.com/${UPSTREAM_REPO}/pull/${match[1]}`,
                  created_at: new Date().toISOString(),
                }
              : null;
          })
          .filter((pr): pr is LocalPR => pr !== null);

        return new Response(JSON.stringify(prs), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Failed to fetch pull requests: ${response.status} ${errorText}`);
    }

    const pullRequests = (await response.json()) as GitHubPR[];
    console.log('Number of PRs found:', pullRequests.length);

    return new Response(JSON.stringify(pullRequests), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching pull requests:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
