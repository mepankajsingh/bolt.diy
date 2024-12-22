import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const UPSTREAM_REPO = 'stackblitz-labs/bolt.diy';

interface CheckoutPRData {
  prNumber: number;
}

interface ProgressResponse {
  status: 'progress' | 'success' | 'error';
  message: string;
  step?: string;
  progress?: number;
  error?: string;
}

interface GitHubPR {
  head: {
    ref: string;
    repo: {
      clone_url: string;
      owner: {
        login: string;
      };
    };
    sha: string;
  };
  base: {
    ref: string;
  };
  number: number;
}

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sendProgress = (data: ProgressResponse) => {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const data = (await request.json()) as CheckoutPRData;
    const prNumber = data.prNumber;

    // Step 1: Check for uncommitted changes
    await sendProgress({
      status: 'progress',
      message: 'Checking working directory...',
      step: 'check_status',
      progress: 10,
    });

    const { stdout: status } = await execAsync('git status --porcelain');

    if (status.trim()) {
      throw new Error('You have uncommitted changes. Please commit or stash them before checking out a PR.');
    }

    // Step 2: Fetching PR details
    await sendProgress({
      status: 'progress',
      message: 'Fetching PR details...',
      step: 'fetch_details',
      progress: 20,
    });

    const apiUrl = `https://api.github.com/repos/${UPSTREAM_REPO}/pulls/${prNumber}`;
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'BoltDIY-App',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR details: ${response.status}`);
    }

    const pr = (await response.json()) as GitHubPR;
    const branchName = pr.head.ref;
    const remoteUrl = pr.head.repo.clone_url;
    const ownerName = pr.head.repo.owner.login;
    const baseBranch = pr.base.ref;
    const commitSha = pr.head.sha;

    console.log(`PR ${prNumber} details:`, {
      branchName,
      remoteUrl,
      ownerName,
      baseBranch,
      commitSha,
    });

    // Step 3: Make sure we're on the base branch
    await sendProgress({
      status: 'progress',
      message: 'Switching to base branch...',
      step: 'base_branch',
      progress: 30,
    });

    try {
      // First try to checkout the local base branch
      await execAsync(`git checkout ${baseBranch}`);
    } catch {
      // If local branch doesn't exist, create it from origin
      await execAsync(`git fetch origin ${baseBranch}`);
      await execAsync(`git checkout -b ${baseBranch} origin/${baseBranch}`);
    }

    // Pull latest changes from base branch
    await execAsync(`git pull origin ${baseBranch}`);
    console.log(`Updated ${baseBranch} branch`);

    // Step 4: Setting up remote
    await sendProgress({
      status: 'progress',
      message: 'Setting up Git remote...',
      step: 'setup_remote',
      progress: 50,
    });

    // Add PR remote if it doesn't exist
    const remoteName = `pr-${ownerName}`;

    try {
      await execAsync(`git remote add ${remoteName} ${remoteUrl}`);
      console.log(`Added remote ${remoteName}`);
    } catch (err) {
      // Remote might already exist, that's fine
      console.log('Remote may already exist:', err instanceof Error ? err.message : err);
    }

    // Step 5: Fetching PR branch
    await sendProgress({
      status: 'progress',
      message: 'Fetching PR branch...',
      step: 'fetch_branch',
      progress: 70,
    });

    // Fetch the specific commit and branch
    await execAsync(`git fetch ${remoteName} ${commitSha}`);
    console.log(`Fetched commit ${commitSha} from ${remoteName}`);

    // Step 6: Checking out branch
    await sendProgress({
      status: 'progress',
      message: 'Checking out PR branch...',
      step: 'checkout',
      progress: 90,
    });

    const branchNameSafe = `pr-${prNumber}-${branchName.replace(/[^a-zA-Z0-9-]/g, '-')}`;

    // Try to create a new branch, if it fails the branch might exist
    try {
      await execAsync(`git checkout -b ${branchNameSafe} ${commitSha}`);
      console.log(`Created and checked out new branch ${branchNameSafe}`);
    } catch {
      // Branch might exist, try to check it out directly
      console.log('Branch may exist, trying to check out existing branch');

      try {
        await execAsync(`git checkout ${branchNameSafe}`);

        // Reset to the specific commit
        await execAsync(`git reset --hard ${commitSha}`);
        console.log(`Checked out existing branch ${branchNameSafe} and reset to ${commitSha}`);
      } catch (checkoutError) {
        console.error(
          'Failed to checkout existing branch:',
          checkoutError instanceof Error ? checkoutError.message : checkoutError,
        );
        throw checkoutError;
      }
    }

    // Step 7: Done
    return sendProgress({
      status: 'success',
      message: `Successfully checked out PR #${prNumber}`,
      step: 'complete',
      progress: 100,
    });
  } catch (err) {
    console.error('Error checking out PR:', err instanceof Error ? err.message : err);
    return sendProgress({
      status: 'error',
      message: `Failed to checkout PR: ${err instanceof Error ? err.message : String(err)}`,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
