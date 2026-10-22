/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native(-community)?|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@tanstack|zustand|expo-router|expo-font|expo-sqlite|expo-secure-store))',
  ],
  moduleNameMapper: {
    '^expo-router$': '<rootDir>/__mocks__/expo-router.tsx',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
