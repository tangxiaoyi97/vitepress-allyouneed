import { defineConfig } from 'tsup'

// 四个独立入口,每个都打 ESM + CJS + d.ts。
// 主入口是 markdown-it 插件函数,VitePress / Vite 入口供高级用户。
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it': 'src/markdown-it.ts',
    vite: 'src/vite.ts',
    vitepress: 'src/vitepress.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  // 不把 peer / 大依赖打进产物
  external: ['markdown-it', 'vitepress', 'vite', '@mdit-vue/shared'],
})
