/**
 * KAN-32: hovering a chat message or a discussion reply must not move anything. The hover toolbar
 * is placed (absolutely positioned) rather than laid out, on both surfaces.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('hover toolbar takes no layout space', () => {
  it('chat: hangs from a zero-size slot beside the bubble', () => {
    const src = read('components/messages/MessageRow.tsx');
    expect(src).toMatch(/<View style=\{styles\.hoverSlot\} pointerEvents="box-none">/);
    expect(src).toMatch(/hoverSlot: \{\s*width: 0,/);
    expect(src).toMatch(/hoverFloat: \{\s*position: 'absolute',/);
  });

  it('discussion: floats over the reply card instead of sitting above it', () => {
    const src = read('app/group/discussion/[id].tsx');
    expect(src).toMatch(
      /<View style=\{styles\.replyHoverFloat\} pointerEvents="box-none">\s*<MessageHoverActions/
    );
    expect(src).toMatch(/replyHoverFloat: \{\s*position: 'absolute',/);
  });
});
