import os from 'os';

export const loader = async () => {
  const systemInfo = {
    version: process.env.npm_package_version || '0.0.0',
    platform: os.platform(),
    arch: os.arch(),
  };

  return new Response(JSON.stringify(systemInfo), {
    headers: { 'Content-Type': 'application/json' },
  });
};
