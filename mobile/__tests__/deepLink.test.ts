import {
  buildResetPasswordDeepLink,
  ROUTES,
} from '../src/navigation/linking';
import { parseResetPasswordDeepLink } from '../src/navigation/useDeepLinks';

describe('access recovery deep link', () => {
  it('reads the token when the path arrives as the host of the URL', () => {
    expect(
      parseResetPasswordDeepLink('ironmind://reset-password?token=abc-123')
    ).toBe('abc-123');
  });

  it('reads the token when the path arrives as the path of the URL', () => {
    expect(
      parseResetPasswordDeepLink('ironmind:///reset-password?token=abc-123')
    ).toBe('abc-123');
  });

  it('ignores the links of the other screens', () => {
    expect(
      parseResetPasswordDeepLink('ironmind://entrar?token=abc-123')
    ).toBeNull();
    expect(parseResetPasswordDeepLink('ironmind://reset-password')).toBeNull();
    expect(parseResetPasswordDeepLink(null)).toBeNull();
  });

  it('builds the link used by the e-mail of recovery', () => {
    expect(buildResetPasswordDeepLink('abc 123')).toBe(
      'ironmind://reset-password?token=abc%20123'
    );
  });

  it('keeps the reset password route reachable by the deep link', () => {
    expect(ROUTES.resetPassword).toBe('/reset-password');
  });
});
