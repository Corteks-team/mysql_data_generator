module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverageFrom: ['src/**/{!(main),}.{ts,js}'],
    setupFiles: ['./test/index.ts'],
};
