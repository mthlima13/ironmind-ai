/** @type {import('jest').Config} */
const unitProject = {
  displayName: 'unit',
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],
  testPathIgnorePatterns: ['\\.integration\\.test\\.ts$'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native(-community)?|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@tanstack|zustand|expo-router|expo-font|expo-sqlite|expo-secure-store))',
  ],
  moduleNameMapper: {
    '^expo-router$': '<rootDir>/__mocks__/expo-router.tsx',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

/**
 * The contract suite talks to a real backend over HTTP.
 *
 * It runs in a plain Node environment with the `node` export condition, so
 * Axios resolves to its Node build and keeps the HTTP adapter. The React
 * Native preset resolves the `browser` build instead, where the HTTP adapter
 * is replaced by a stub and every request comes back empty.
 */
const contractProject = {
  displayName: 'contract',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node'],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.contract.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.integration.test.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|expo|@expo|expo-secure-store|expo-constants))',
  ],
  moduleNameMapper: {
    // Axios resolves to its browser build under the React Native resolver, and
    // that build has no HTTP adapter: every request comes back empty. The
    // Node bundle keeps the adapter that talks to a real server.
    '^axios$': '<rootDir>/node_modules/axios/dist/node/axios.cjs',
  },
};

module.exports = {
  projects: [unitProject, contractProject],
};
