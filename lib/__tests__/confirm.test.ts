import { Alert, Platform } from 'react-native';

import { confirm } from '@/lib/confirm';

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
    expect(windowConfirm).toHaveBeenCalledWith('Sign out\n\nAre you sure?');

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
