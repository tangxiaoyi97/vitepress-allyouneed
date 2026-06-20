<!--
  TEST 3: Vue 组件替换 —— 把插件默认 <VaultStats /> 换成这个"明显是替换品"的占位。

  关键机制(由 vitepress-allyouneed/theme 的 defineTheme() 保证):
    1. defineTheme() 内部先调 app.component('VaultStats', PluginDefault)
    2. 再跑用户传入的 enhanceApp(ctx) → 用户 ctx.app.component('VaultStats', MyVaultStats)
    3. Vue 同名注册"后注册的赢" → 这个 MyVaultStats 接管所有 <VaultStats /> 渲染

  组件本身不做实际功能 —— 只渲染一个醒目的紫色块,确认替换生效。
  真实场景里可以读 vault-data.json 自己渲染一切。
-->

<template>
  <div class="rainbow-replaced-stats" role="status">
    <h2 class="rainbow-replaced-stats__title">✨ Replaced VaultStats ✨</h2>
    <p class="rainbow-replaced-stats__hint">
      If you see this purple box instead of the default stats card grid,
      Vue component replacement is working.
    </p>
  </div>
</template>

<style scoped>
/* scoped CSS → 只影响本组件,不会污染其它 .rainbow-replaced-stats 选择器(用户
   要全局调还是要写非 scoped 的覆盖) */
.rainbow-replaced-stats {
  margin: 1.5rem 0;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #a06cd5, #6a4dba);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(106, 77, 186, 0.3);
}

.rainbow-replaced-stats__title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.rainbow-replaced-stats__hint {
  margin: 0;
  opacity: 0.9;
  font-size: 0.95rem;
}
</style>
