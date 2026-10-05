import path from 'node:path'
import { defineConfig } from 'vitest/config'

/*
 * Mui gio CO DINH cho moi lan chay test — dat TRUOC khi worker khoi dong de
 * worker thua huong. Cac ham doc/ghi moc thoi gian Drupal (UTC khong hau to)
 * cho ra ket qua khac nhau theo mui gio may; khong co dinh thi test xanh tren
 * may dev GMT+7 va do tren runner CI (UTC), hoac nguoc lai.
 */
process.env.TZ = 'Asia/Ho_Chi_Minh'

/*
 * Cau hinh RIENG, khong gop vao vite.config.ts: file do mang plugin PWA va
 * "chan build khi thieu VITE_API_BASE_URL o mode production" — test logic
 * thuan khong can ca hai.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
