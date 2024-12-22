import { execSync } from 'child_process';

export async function resetToMain() {
  try {
    execSync('git reset --hard origin/main', { encoding: 'utf8' });
  } catch (error) {
    throw new Error(`Failed to reset to main: ${(error as Error).message}`);
  }
}
