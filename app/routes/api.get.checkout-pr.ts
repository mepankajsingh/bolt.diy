import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PRRequestData {
  prNumber: number;
}

interface PRData {
  head: {
    ref: string;
    repo: {
      clone_url: string;
    };
  };
}

export const action = async ({ request, _params }: { request: Request; _params: unknown }) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const data = (await request.json()) as PRRequestData;

  if (!data.prNumber) {
    return new Response(JSON.stringify({ error: 'PR number is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch PR details
    const prResponse = await fetch(`https://api.github.com/repos/stackblitz-labs/bolt.diy/pulls/${data.prNumber}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!prResponse.ok) {
      throw new Error('Failed to fetch PR details');
    }

    const prData = (await prResponse.json()) as PRData;
    const branchName = prData.head.ref;

    // Add PR remote if it doesn't exist
    try {
      await execAsync(`git remote add pr${data.prNumber} ${prData.head.repo.clone_url}`);
    } catch {
      // Remote might already exist, continue
    }

    // Fetch and checkout PR branch
    await execAsync(`git fetch pr${data.prNumber} ${branchName}`);
    await execAsync(`git checkout -b pr-${data.prNumber} pr${data.prNumber}/${branchName}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to checkout PR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
