import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        // Transports son infraestructura runtime — no testeable en unit tests
        'src/transports/**',
        // Types son interfaces — no contienen lógica ejecutable
        'src/types/**',
      ],
      thresholds: {
        // Thresholds globales mínimos
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
        // Thresholds por módulo crítico
        'src/clients/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/schemas/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/tools/**': {
          statements: 85,
          branches: 70,
          functions: 85,
          lines: 85,
        },
      },
    },
  },
});
