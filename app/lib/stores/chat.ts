import { map } from 'nanostores';
import type { Message } from 'ai';

export const chatStore = map({
  started: false,
  aborted: false,
  showChat: true,
  messages: [] as Message[],
  title: '',
});

export function updateChatMessages(messages: Message[]) {
  chatStore.setKey('messages', messages);
}
