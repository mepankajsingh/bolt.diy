import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CheckoutPRData {
  prNumber: number;
}

export const action = async ({ request, _params }: { request: Request; _params: unknown }): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const data = (await request.json()) as CheckoutPRData;
  const prNumber = data.prNumber;

  try {
    await checkoutPR(prNumber);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Failed to checkout PR:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Failed to checkout PR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function checkoutPR(prNumber: number): Promise<void> {
  try {
    // Clean the working directory
    await execAsync('git clean -fd');

    // Add PR remote if it doesn't exist
    const remoteName = `pr${prNumber}`;

    try {
      await execAsync(`git remote add ${remoteName} https://github.com/stackblitz-labs/bolt.diy.git`);
    } catch {
      // Remote might already exist, that's okay
    }

    // Fetch the PR
    await execAsync(`git fetch ${remoteName} pull/${prNumber}/head:pr-${prNumber}`);

    // Checkout the PR branch
    await execAsync(`git checkout pr-${prNumber}`);

    // Pull latest changes
    await execAsync(`git pull ${remoteName} pull/${prNumber}/head`);
  } catch (error) {
    console.error('Error during PR checkout:', error);
    throw error;
  }
}
