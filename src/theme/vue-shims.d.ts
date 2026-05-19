/**
 * 让 TypeScript 认识 .vue 文件导入。
 *
 * theme/index.ts 里有 `import X from './components/X.vue'`,TS 默认不知道
 * .vue 是什么,会报 TS2307。这一份 shim 把所有 .vue 视为 default-exported
 * Vue DefineComponent。tsconfig include 字段覆盖整个 src 目录,会自动加载本文件。
 *
 * 后果:用户 .d.ts 里的组件类型是泛型 DefineComponent —— 不带 props/emits
 * 的精确签名。要更精确,可用 vue-tsc 重做 dts(留 v0.3 优化)。
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >
  export default component
}
