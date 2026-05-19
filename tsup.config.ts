import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

// 五个入口,各打 ESM + CJS + d.ts。
// v0.2 加 theme entry;.vue 文件不进 tsup 编译流,而是按源文件拷贝到 dist
// (业界通行,element-plus / naive-ui 都这样),用户的 VitePress 用 @vitejs/plugin-vue 自动处理。
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it': 'src/markdown-it.ts',
    vite: 'src/vite.ts',
    vitepress: 'src/vitepress.ts',
    'theme/index': 'src/theme/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  external: [
    'markdown-it',
    'vitepress',
    'vite',
    'vue',
    '@mdit-vue/shared',
    'd3-force',
    'd3-selection',
    'd3-drag',
    'd3-zoom',
  ],
  onSuccess: async () => {
    // 把 src/theme/components/*.vue 和 src/theme/styles/*.css 按原样拷贝到 dist
    copyDirContents('src/theme/components', 'dist/theme/components', /\.vue$/)
    copyDirContents('src/theme/styles', 'dist/theme/styles', /\.css$/)
  },
})

function copyDirContents(src: string, dst: string, filter: RegExp): void {
  try {
    const entries = readdirSync(src, { withFileTypes: true })
    for (const e of entries) {
      const sp = join(src, e.name)
      const dp = join(dst, e.name)
      if (e.isDirectory()) {
        copyDirContents(sp, dp, filter)
      } else if (filter.test(e.name)) {
        mkdirSync(dirname(dp), { recursive: true })
        copyFileSync(sp, dp)
        // eslint-disable-next-line no-console
        console.log(`  [copy] ${relative('.', sp)} → ${relative('.', dp)}`)
      }
    }
  } catch {
    /* 目录不存在,跳过 */
  }
  void statSync
}
