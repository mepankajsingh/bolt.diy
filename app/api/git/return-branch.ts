import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function returnToPreviousBranch(): Promise<void> {
  try {
    // Get current branch name
    const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD');

    // Store it before switching
    await execAsync(`git config --local bolt.previousBranch ${currentBranch.trim()}`);

    // Get the previous branch from git config
    const { stdout: previousBranch } = await execAsync('git config --local bolt.previousBranch');

    if (!previousBranch.trim()) {
      throw new Error('No previous branch found');
    }

    // Clean working directory and checkout previous branch
    await execAsync('git clean -fd');
    await execAsync(`git checkout ${previousBranch.trim()}`);
  } catch (error) {
    console.error('Error returning to previous branch:', error);
    throw error;
  }
}

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    await returnToPreviousBranch();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to return to previous branch:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Failed to return to previous branch' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
