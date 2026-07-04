import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/spell-game/',  // Gitee Pages 路径: 你的用户名.gitee.io/spell-game/
})
