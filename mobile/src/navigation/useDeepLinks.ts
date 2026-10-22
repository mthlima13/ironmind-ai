import { useEffect } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';

import { DEEP_LINK_PATHS, ROUTES } from './linking';

/**
 * Host of the access recovery link, used when the path arrives as the host
 * of the URL (`ironmind://reset-password?token=...`).
 */
const RESET_PASSWORD_HOST = DEEP_LINK_PATHS.resetPassword;

/** `scheme://host/path?query` of a deep link. */
const DEEP_LINK_PATTERN =
  /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?/;

type DeepLink = {
  scheme: string;
  host: string;
  path: string;
  query: string;
};

function readDeepLink(url: string): DeepLink | null {
  const match = DEEP_LINK_PATTERN.exec(url);
  if (!match) {
    return null;
  }

  return {
    scheme: match[1] ?? '',
    host: match[2] ?? '',
    path: (match[3] ?? '').replace(/^\/+/, ''),
    query: match[4] ?? '',
  };
}

function readQueryParam(query: string, name: string): string | null {
  const pairs = query.split('&').filter(Boolean);

  for (const pair of pairs) {
    const separator = pair.indexOf('=');
    const key = separator === -1 ? pair : pair.slice(0, separator);
    const value = separator === -1 ? '' : pair.slice(separator + 1);

    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }

  return null;
}

/**
 * Reads the recovery token of a deep link.
 *
 * The path of the link can arrive as the host of the URL
 * (`ironmind://reset-password?token=...`) or as the path
 * (`ironmind:///reset-password?token=...`). It returns `null` when the URL is
 * not a recovery link or when it has no token.
 */
export function parseResetPasswordDeepLink(
  url: string | null | undefined
): string | null {
  if (!url) {
    return null;
  }

  const link = readDeepLink(url);
  if (!link) {
    return null;
  }

  const isResetLink =
    link.host === RESET_PASSWORD_HOST || link.path === RESET_PASSWORD_HOST;
  if (!isResetLink) {
    return null;
  }

  const token = readQueryParam(link.query, 'token');
  return token && token.length > 0 ? token : null;
}

/**
 * Handles the deep links of the app (SPEC 15.1).
 *
 * The access recovery link carries a single use token in the query string.
 * The Expo Router resolves the path of the URL, so the link is also read
 * here to support the form where the path arrives as the host of the URL.
 */
export function useDeepLinks(): void {
  useEffect(() => {
    const handleUrl = (url: string | null | undefined) => {
      const token = parseResetPasswordDeepLink(url);
      if (!token) {
        return;
      }

      router.push({ pathname: ROUTES.resetPassword, params: { token } });
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    void Linking.getInitialURL()
      .then((url) => {
        handleUrl(url);
      })
      .catch(() => {
        // The app was opened without a link.
      });

    return () => {
      subscription.remove();
    };
  }, []);
}
