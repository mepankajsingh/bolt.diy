import { exec } from 'child_process';
import { promisify } from 'util';
import type { NextApiRequest, NextApiResponse } from 'next';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to reset to main' });
  }
}
