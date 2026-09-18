import { composeAction } from '@/lib/composeAction';

const base = { voiceAvailable: true, text: '', attachmentCount: 0, editing: false };

describe('composeAction', () => {
  it('offers one-tap voice when there is nothing to send', () => {
    expect(composeAction(base)).toBe('voice');
    expect(composeAction({ ...base, text: '   \n' })).toBe('voice');
  });

  it('turns back into send as soon as there is text or an attachment', () => {
    expect(composeAction({ ...base, text: 'hi' })).toBe('send');
    expect(composeAction({ ...base, attachmentCount: 1 })).toBe('send');
  });

  it('never offers voice while editing a message, or where voice is not available', () => {
    expect(composeAction({ ...base, editing: true })).toBe('send');
    expect(composeAction({ ...base, voiceAvailable: false })).toBe('send');
  });
});
