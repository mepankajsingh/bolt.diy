import { json } from '@remix-run/cloudflare';
import { resetToMain } from '~/lib/git';

export async function action() {
  try {
    await resetToMain();
    return json({ success: true });
  } catch (error) {
    return json({ success: false, error: (error as Error).message });
  }
}
