import { exec } from 'child_process';
import { promisify } from 'util';
import type { ActionFunctionArgs } from '@remix-run/node';

const execAsync = promisify(exec);

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Clean up and reset to main
    await execAsync('git clean -fd');
    await execAsync('git checkout main');
    await execAsync('git reset --hard origin/main');
    await execAsync('git pull origin main');

    // Clean up PR remotes
    const { stdout: remotes } = await execAsync('git remote');
    const prRemotes = remotes.split('\n').filter((remote) => remote.startsWith('pr'));

    for (const remote of prRemotes) {
      await execAsync(`git remote remove ${remote}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to reset to main' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
