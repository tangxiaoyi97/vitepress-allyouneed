import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import type { Plugin as EsbuildPlugin } from 'esbuild'

/**
 * v0.2 build config。
 *
 * - 5 个入口:index / markdown-it / vite / vitepress / theme/index
 * - **dts 入口只包 4 个** —— theme/index 的 .d.ts 用 onSuccess 手写产出,
 *   原因:rollup-plugin-dts(tsup 内部用的)不识别 `declare module '*.vue'`,
 *   会去 .vue 源文件找 default export 找不到而报错。手写 .d.ts 绕开这个问题
 * - .vue / .css 走 esbuild plugin 标 external,由 onSuccess 拷贝到 dist
 *
 * 业界通行做法(element-plus / naive-ui / 几乎所有打 .vue 组件库的都这样)。
 */

const externalVueAndCssPlugin: EsbuildPlugin = {
  name: 'external-vue-and-css',
  setup(build) {
    build.onResolve({ filter: /\.vue(\?.*)?$/ }, (args) => ({
      path: args.path,
      external: true,
    }))
    build.onResolve({ filter: /\.css(\?.*)?$/ }, (args) => ({
      path: args.path,
      external: true,
    }))
  },
}

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it': 'src/markdown-it.ts',
    vite: 'src/vite.ts',
    vitepress: 'src/vitepress.ts',
    'theme/index': 'src/theme/index.ts',
    // .vue 组件在运行时(用户 Vite 编译时)会 import '../composables/useVaultData.js',
    // 所以必须把它编成单独的 dist 文件,而不是内联进 theme/index.js
    'theme/composables/useVaultData': 'src/theme/composables/useVaultData.ts',
  },
  format: ['esm', 'cjs'],
  // dts 排除 theme/index(下面 post-tsup script 手写)
  // theme/composables/useVaultData 是纯 TS,无 .vue 引用,dts 正常生成
  dts: {
    entry: {
      index: 'src/index.ts',
      'markdown-it': 'src/markdown-it.ts',
      vite: 'src/vite.ts',
      vitepress: 'src/vitepress.ts',
      'theme/composables/useVaultData': 'src/theme/composables/useVaultData.ts',
    },
  },
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
  esbuildPlugins: [externalVueAndCssPlugin],
  onSuccess: async () => {
    copyDirContents('src/theme/components', 'dist/theme/components', /\.vue$/)
    copyDirContents('src/theme/styles', 'dist/theme/styles', /\.css$/)
    // theme/index.d.ts 的写入挪到 `package.json scripts.build` 链路后置的
    // node scripts/write-theme-dts.mjs —— onSuccess 早于 DTS 步骤,DTS 步骤
    // 会清扫 dist 路径覆盖掉这里写的文件。post-tsup 写就稳了。
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
}
