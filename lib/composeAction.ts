/**
 * What the button at the end of the chat composer does: send what was typed or attached, or —
 * when there is nothing to send — start a voice message with one tap (KAN-30, the WhatsApp and
 * Telegram pattern).
 */
export type ComposeAction = 'send' | 'voice';

export interface ComposeActionInput {
  /** The screen offers voice messages here. */
  voiceAvailable: boolean;
  text: string;
  attachmentCount: number;
  /** Editing an existing message: its text can change, but it cannot become a recording. */
  editing: boolean;
}

export function composeAction({
  voiceAvailable,
  text,
  attachmentCount,
  editing,
}: ComposeActionInput): ComposeAction {
  if (!voiceAvailable || editing) return 'send';
  return text.trim() === '' && attachmentCount === 0 ? 'voice' : 'send';
}
