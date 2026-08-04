---
name: card-reveal-animation
description: 为卡片、网格、列表元素添加滚动入场动画效果。当需要给新页面/组件添加淡入滑入动画、交错出现效果时使用此 skill。关键词：入场动画、滚动动画、stagger、reveal、RevealGroup。
---

# 卡片入场动画接入指南

项目已封装 `<RevealGroup>` 组件，一行标签即可实现交错入场动画。

## 最简用法（一行标签）

```tsx
import RevealGroup from '../components/RevealGroup'

<RevealGroup stagger={120} perRow={4} className="my-grid">
  {items.map(item => (
    <div key={item.id}>{item.content}</div>
  ))}
</RevealGroup>
```

无需手动挂 ref，无需手动加 CSS class，组件内部自动处理。

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `stagger` | `number` | `0` | 交错延迟(ms)，每个子元素依次延迟出现 |
| `perRow` | `number` | 子元素总数 | 每行数量，与 CSS grid 列数一致 |
| `className` | `string` | `''` | 容器的 CSS class |
| `children` | `ReactNode` | — | 子元素，自动注入 `reveal-up` class |

## 参数选择建议

| 布局 | perRow | stagger |
|------|--------|---------|
| 4列网格 | 4 | 120 |
| 3列网格 | 3 | 120 |
| 2列网格 | 2 | 120 |

`stagger` 推荐 100~150ms，过大会有明显等待感。

## 已应用参考

| 页面 | 用法 |
|------|------|
| Destinations.tsx | `<RevealGroup stagger={120} perRow={4} className="cities-grid">` |
| WeddingShop.tsx | `<RevealGroup stagger={120} perRow={3} className="product-grid">` |
| Listing.tsx | `<RevealGroup stagger={120} perRow={3} className="product-grid">` |
| ListingDestination.tsx | `<RevealGroup stagger={120} perRow={4} className="dest-city-venues">` |
| ListingProducts.tsx | `<RevealGroup stagger={120} perRow={4} className="dest-city-venues">` |
| ListingDetail.tsx | `<RevealGroup stagger={120} perRow={2} className="cust-grid cust-grid--venue">` |

## 原理

- `RevealGroup` 内部使用 `useRevealChildren` hook（IntersectionObserver）
- 自动给每个直接子元素注入 `.reveal-up` CSS class
- `.reveal-up` 初始态：`translateY(60px) + opacity: 0`
- 进入视口后添加 `.is-visible`：`translateY(0) + opacity: 1`
- 过渡曲线：`0.9s cubic-bezier(0.16, 1, 0.3, 1)`

## 注意事项

1. **子元素有自身 transition（hover 效果）**：CSS 中已有 `.product-card.reveal-up` / `.quote-card.reveal-up` 的覆盖规则，新增卡片类型时如需同样处理，在 `index.css` 中添加对应复合选择器

2. **动态列表**：筛选后重新渲染的卡片需确保 `key` 唯一，RevealGroup 会在挂载时重新观察

## 关键文件

- 组件：`src/components/RevealGroup.tsx`
- Hook：`src/hooks/useScrollAnimations.ts` → `useRevealChildren`
- CSS：`src/styles/index.css` → 搜索 `.reveal-up`
