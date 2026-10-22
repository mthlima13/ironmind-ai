/**
 * Global Jest setup for the IronMind AI mobile app.
 *
 * Native modules used by the app are replaced by lightweight mocks so the test
 * suite runs on Node without an emulator.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
    WHEN_UNLOCKED: 'whenUnlocked',
    AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  };
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('expo-font', () => {
  const actual = jest.requireActual('expo-font');
  return {
    ...actual,
    useFonts: () => [true, null],
    loadAsync: jest.fn(async () => undefined),
    isLoaded: () => true,
  };
});

jest.mock('expo-sqlite', () => {
  const rows: unknown[] = [];
  return {
    openDatabaseAsync: jest.fn(async () => ({
      execAsync: jest.fn(async () => undefined),
      runAsync: jest.fn(async () => undefined),
      getAllAsync: jest.fn(async () => rows),
      getFirstAsync: jest.fn(async () => null),
      closeAsync: jest.fn(async () => undefined),
    })),
  };
});

jest.mock('expo-constants', () => ({
  ...jest.requireActual('expo-constants'),
  default: {
    ...jest.requireActual('expo-constants').default,
    expoConfig: { scheme: 'ironmind' },
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = (props: Record<string, unknown>) =>
    React.createElement(Text, props, props.name ?? '');
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === '__esModule') {
          return true;
        }
        return Icon;
      },
    }
  );
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, props, props.children),
  };
});
