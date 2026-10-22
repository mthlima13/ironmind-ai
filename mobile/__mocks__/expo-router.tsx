import * as React from 'react';
import { Text } from 'react-native';

export type RouterMock = {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  navigate: jest.Mock;
  setParams: jest.Mock;
  dismiss: jest.Mock;
  prefetch: jest.Mock;
  canGoBack: jest.Mock;
};

export const router: RouterMock = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
  dismiss: jest.fn(),
  prefetch: jest.fn(),
  canGoBack: jest.fn(() => false),
};

export function useRouter(): RouterMock {
  return router;
}

export function usePathname(): string {
  return '/';
}

export function useSegments(): string[] {
  return ['(tabs)'];
}

/**
 * Parameters of the current route.
 *
 * The tests configure them to simulate a deep link, such as
 * `ironmind://reset-password?token=...`.
 */
export const searchParams: {
  current: Record<string, string | string[]>;
} = {
  current: {},
};

export function useLocalSearchParams<
  T extends Record<string, string | string[] | undefined> = Record<
    string,
    string | string[] | undefined
  >,
>(): T {
  return searchParams.current as unknown as T;
}

export function useGlobalSearchParams(): Record<string, string | string[]> {
  return {};
}

export function useNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  };
}

export function useFocusEffect(effect: () => void | (() => void)): void {
  React.useEffect(() => {
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Link({
  children,
  href,
}: {
  children?: React.ReactNode;
  href: string;
}) {
  return <Text accessibilityRole="link">{children ?? href}</Text>;
}

export function Redirect(): null {
  return null;
}

type LayoutProps = {
  children?: React.ReactNode;
};

export function Stack({ children }: LayoutProps) {
  return <>{children}</>;
}

Stack.Protected = function Protected({
  children,
  guard,
}: LayoutProps & { guard: boolean }) {
  return <>{guard ? children : null}</>;
};

export function Tabs({ children }: LayoutProps) {
  return <>{children}</>;
}

export default {};
