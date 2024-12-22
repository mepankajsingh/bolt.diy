export async function getSystemInfo(): Promise<string> {
  try {
    const response = await fetch('/api/system/info');

    if (!response.ok) {
      throw new Error('Failed to fetch system info');
    }

    const data = await response.json();

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error fetching system info:', error);
    return 'Failed to fetch system information';
  }
}
