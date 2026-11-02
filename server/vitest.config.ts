import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
    // 测试绝不能调用真实模型：dotenv 不覆盖已有变量，这里优先于本地 .env。
    env: { AI_PROVIDER: 'mock', AI_API_KEY: '', AI_MODEL: '' },
  },
})
