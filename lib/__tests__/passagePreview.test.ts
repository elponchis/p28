import { passagePreview } from '@/lib/passagePreview';

describe('passagePreview', () => {
  it('stops at the second verse number', () => {
    const passage = [
      '4 Now the word of the Lord came to me, saying,',
      '',
      '5 “Before I formed you in the womb I knew you,',
      'and before you were born I consecrated you;',
    ].join('\n');

    const { preview, hasMore } = passagePreview(passage);
    expect(preview).toBe('4 Now the word of the Lord came to me, saying,');
    expect(hasMore).toBe(true);
  });

  it('keeps a verse that runs over several lines whole', () => {
    // Verse 5 is three lines; only verse 6 ends it.
    const passage = [
      '5 “Before I formed you in the womb I knew you,',
      'and before you were born I consecrated you;',
      'I appointed you a prophet to the nations.”',
      '6 Then I said, “Ah, Lord God!',
    ].join('\n');

    const { preview, hasMore } = passagePreview(passage);
    expect(preview.split('\n')).toHaveLength(3);
    expect(preview.endsWith('prophet to the nations.”')).toBe(true);
    expect(hasMore).toBe(true);
  });

  it('shows the whole of a single verse and offers nothing more', () => {
    const passage = '2 모든 겸손과 온유로 하고 오래 참음으로 사랑 가운데서 서로 용납하고';
    expect(passagePreview(passage)).toEqual({ preview: passage, hasMore: false });
  });

  it('falls back to the first paragraph when there are no verse numbers', () => {
    const passage = '첫 문단입니다.\n\n둘째 문단입니다.';
    const { preview, hasMore } = passagePreview(passage);
    expect(preview).toBe('첫 문단입니다.');
    expect(hasMore).toBe(true);
  });

  it('handles an empty passage', () => {
    expect(passagePreview('')).toEqual({ preview: '', hasMore: false });
  });
});
