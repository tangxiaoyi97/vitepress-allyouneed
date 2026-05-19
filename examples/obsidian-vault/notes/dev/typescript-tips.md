---
tags: [dev, typescript]
---

# TypeScript Tips

## satisfies operator

```ts
const config = { mode: 'dev' } satisfies Config
```

比 `as Config` 安全:不放宽类型,只校验。

## 模板字符串类型

```ts
type Route = `/${string}`
type Method = `${'GET' | 'POST'} /${string}`
```

详见 [[ts-utility-types]]。

#dev #typescript
