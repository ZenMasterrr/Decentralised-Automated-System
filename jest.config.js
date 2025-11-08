module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: false,
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
