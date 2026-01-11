// Renombrar este archivo a jest.config.cjs para CommonJS
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
};
