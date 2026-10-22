import { render } from '@testing-library/react-native';
import {
  Alert,
  BackHandler,
  Text,
  type NativeEventSubscription,
} from 'react-native';
import { router } from 'expo-router';

import type { RouterMock } from '../__mocks__/expo-router';
import { useSessionStore } from '../src/features/workouts/session.store';
import { BackHandlerProvider } from '../src/navigation/BackHandlerProvider';
import { EXIT_DIALOG } from '../src/navigation/backActions';
import type { WorkoutSession } from '../src/types/workout';

const mockRouter = router as unknown as RouterMock;

const ACTIVE_SESSION: WorkoutSession = {
  id: 'ses-1',
  programId: 'prg-ppl',
  programDayId: 'day-push',
  startedAt: '2026-10-21T18:00:00.000Z',
  completedAt: null,
  status: 'IN_PROGRESS',
  exercises: [],
};

type BackHandlerCallback = (event?: unknown) => boolean | undefined;

describe('BackHandlerProvider', () => {
  let capturedHandler: BackHandlerCallback | null = null;
  let alertSpy: jest.SpyInstance;
  let exitAppSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedHandler = null;
    mockRouter.canGoBack.mockReturnValue(false);
    mockRouter.back.mockReset();

    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        capturedHandler = handler as BackHandlerCallback;
        return { remove: jest.fn() } as unknown as NativeEventSubscription;
      });

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    exitAppSpy = jest
      .spyOn(BackHandler, 'exitApp')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    useSessionStore.setState({ session: null });
  });

  const renderProvider = () =>
    render(
      <BackHandlerProvider>
        <Text>conteúdo</Text>
      </BackHandlerProvider>
    );

  it('registers the hardware back listener', async () => {
    await renderProvider();

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function)
    );
    expect(capturedHandler).not.toBeNull();
  });

  it('goes back to the previous screen of the stack', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await renderProvider();

    const handled = capturedHandler?.();

    expect(handled).toBe(true);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('asks for confirmation before leaving the app from the first screen', async () => {
    await renderProvider();

    const handled = capturedHandler?.();

    expect(handled).toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe(EXIT_DIALOG.title);
    expect(exitAppSpy).not.toHaveBeenCalled();
  });

  it('asks for confirmation when a session is in progress', async () => {
    useSessionStore.setState({ session: ACTIVE_SESSION });
    await renderProvider();

    const handled = capturedHandler?.();

    expect(handled).toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe(EXIT_DIALOG.sessionTitle);
    expect(exitAppSpy).not.toHaveBeenCalled();
  });

  it('only closes the app after the user confirms', async () => {
    useSessionStore.setState({ session: ACTIVE_SESSION });
    await renderProvider();

    capturedHandler?.();

    const buttons = alertSpy.mock.calls[0][2] as {
      text?: string;
      onPress?: () => void;
    }[];
    const confirmButton = buttons.find(
      (button) => button.text === EXIT_DIALOG.confirmLabel
    );

    expect(confirmButton).toBeDefined();
    confirmButton?.onPress?.();

    expect(exitAppSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the listener when the provider is unmounted', async () => {
    const remove = jest.fn();
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        capturedHandler = handler as BackHandlerCallback;
        return { remove } as unknown as NativeEventSubscription;
      });

    const { unmount } = await renderProvider();
    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
