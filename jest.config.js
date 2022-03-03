/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = {
  modulePathIgnorePatterns: ['/node_modules/', '<rootDir>/dist', '\\.d\\.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  transform: {},
  transformIgnorePatterns: ['\\.js$', '\\.jsx$', '\\.json$'],
  detectOpenHandles: true,
  forceExit: true,
};
