module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFiles: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
};
