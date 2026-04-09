// jest.config.js
// Jest configuration for Adv_Backend test suite.

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testTimeout: 30000,
  verbose: true,
  // uuid v13+ is ESM-only — transform it to CJS for Jest
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)',
  ],
  transform: {
    '\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
};
