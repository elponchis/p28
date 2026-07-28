import { enqueueDocumentPick } from '../documentPickerLock';

describe('enqueueDocumentPick', () => {
  it('runs pickers one after another', async () => {
    const order: string[] = [];
    const p1 = enqueueDocumentPick(async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 15));
      order.push('a-end');
      return 1;
    });
    const p2 = enqueueDocumentPick(async () => {
      order.push('b-start');
      return 2;
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(order).toEqual(['a-start', 'a-end', 'b-start']);
  });

  it('continues the queue after a rejected pick', async () => {
    const order: string[] = [];
    const p1 = enqueueDocumentPick(async () => {
      order.push('fail');
      throw new Error('boom');
    });
    const p2 = enqueueDocumentPick(async () => {
      order.push('after');
      return 'ok';
    });
    await expect(p1).rejects.toThrow('boom');
    await expect(p2).resolves.toBe('ok');
    expect(order).toEqual(['fail', 'after']);
  });
});
