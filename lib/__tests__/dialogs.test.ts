import { Alert, Platform } from 'react-native';

import { confirm, notify } from '@/lib/dialogs';

// This project's Jest setup is plain ts-jest/node, so `react-native` is mocked
// wholesale rather than transformed. `jest.mock` is hoisted above the imports.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));

const options = {
  title: 'Sign out',
  message: 'Are you sure?',
  confirmLabel: 'Sign out',
  cancelLabel: 'Cancel',
  destructive: true,
};

const platform = Platform as unknown as { OS: string };
const alertMock = Alert.alert as jest.Mock;

describe('confirm', () => {
  afterEach(() => {
    platform.OS = 'ios';
    alertMock.mockReset();
    delete (globalThis as { window?: unknown }).window;
  });

  it('resolves with the window.confirm result on web', async () => {
    platform.OS = 'web';
    const windowConfirm = jest.fn().mockReturnValue(true);
    (globalThis as { window?: unknown }).window = { confirm: windowConfirm };

    await expect(confirm(options)).resolves.toBe(true);
    // Only the message: window.confirm has no title slot, and passing both
    // would show the action name twice.
    expect(windowConfirm).toHaveBeenCalledWith('Are you sure?');

    windowConfirm.mockReturnValue(false);
    await expect(confirm(options)).resolves.toBe(false);
  });

  it('resolves false on web when no window.confirm is available', async () => {
    platform.OS = 'web';
    await expect(confirm(options)).resolves.toBe(false);
  });

  it('resolves true when the confirm button is pressed on native', async () => {
    alertMock.mockImplementation(
      (_title: string, _message: string, buttons: { onPress?: () => void }[]) => {
        buttons[1].onPress?.();
      }
    );

    await expect(confirm(options)).resolves.toBe(true);
    expect(alertMock).toHaveBeenCalled();
  });

  it('resolves false when the cancel button is pressed on native', async () => {
    alertMock.mockImplementation(
      (_title: string, _message: string, buttons: { onPress?: () => void }[]) => {
        buttons[0].onPress?.();
      }
    );

    await expect(confirm(options)).resolves.toBe(false);
  });
});

describe('notify', () => {
  afterEach(() => {
    platform.OS = 'ios';
    alertMock.mockReset();
    delete (globalThis as { window?: unknown }).window;
  });

  it('shows the message through window.alert on web', async () => {
    platform.OS = 'web';
    const windowAlert = jest.fn();
    (globalThis as { window?: unknown }).window = { alert: windowAlert };

    await notify({ title: 'Deleted', message: 'Your account is gone.' });

    expect(windowAlert).toHaveBeenCalledWith('Your account is gone.');
  });

  it('falls back to the title when there is no message', async () => {
    platform.OS = 'web';
    const windowAlert = jest.fn();
    (globalThis as { window?: unknown }).window = { alert: windowAlert };

    await notify({ title: 'Deleted' });

    expect(windowAlert).toHaveBeenCalledWith('Deleted');
  });

  it('resolves without throwing on web when window.alert is missing', async () => {
    platform.OS = 'web';
    await expect(notify({ title: 'Deleted' })).resolves.toBeUndefined();
  });

  it('waits for the dismiss button on native when one is given', async () => {
    let press: (() => void) | undefined;
    alertMock.mockImplementation(
      (_title: string, _message: string, buttons: { onPress?: () => void }[]) => {
        press = buttons[0].onPress;
      }
    );

    let settled = false;
    const pending = notify({ title: 'Deleted', dismissLabel: 'Done' }).then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    press?.();
    await pending;
    expect(settled).toBe(true);
  });

  it('resolves immediately on native without a dismiss label', async () => {
    await expect(notify({ title: 'Saved' })).resolves.toBeUndefined();
    expect(alertMock).toHaveBeenCalled();
  });
});
