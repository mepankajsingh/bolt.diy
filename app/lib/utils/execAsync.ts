import { webcontainer } from '~/lib/webcontainer';

export const execAsync = async (command: string) => {
  const container = await webcontainer;

  if (!container) {
    throw new Error('WebContainer not initialized');
  }

  const process = await container.spawn('sh', ['-c', command]);
  const exitCode = await process.exit;

  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}`);
  }

  // Read stdout stream into a string
  const stdout = await streamToString(process.stdout);
  const stderr = await streamToString(process.stderr);

  return { stdout, stderr, exitCode };
};

async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      result += value;
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}
