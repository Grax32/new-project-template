const { createGlobPatternsForDependencies } = require('@nx/js');
const { join } = require('path');

module.exports = {
  displayName: 'api',
  preset: './jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: './coverage',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
};
