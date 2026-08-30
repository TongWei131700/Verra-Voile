# 摄影师前端页面架构

> 本文件从 SKILL.md 拆分而出，仅在修改前端页面时读取。

## 路由
- 摄影列表页：`/photography` → `Photography.tsx`
- 摄影详情页：`/photography/:slug` → `PhotographyDetail.tsx`

## 列表页功能（Photography.tsx）
- 全屏 Hero 背景图
- 搜索框（按名称、风格搜索）
- 筛选栏：国家、摄影风格（桌面端左侧栏 + 移动端抽屉）
- 卡片列表：封面图 + 名称 + 宣传语 + 风格标签 + 价格
- 已预定（意向单）摄影师置顶显示，带花环徽章

## 详情页模块顺序

```
Hero 区域（三态：骨架屏 → 视频背景 / 轮播图）
  ├── 左侧/背景：视频背景 或 轮播图（前3张） 或 骨架屏
  └── 右侧/居中：信息面板（头像、名字、标签、宣传语、网站链接）
    ↓
摄影师介绍（desc 正文）
    ↓
摄影风格（网格卡片） + 作品展（瀑布流双列，分页加载）
    ↓
底部预定栏（价格 + 咨询 + 加入意向单）
```

## Hero 区域三态逻辑

```
有 videoUrl 且非 YouTube？（通过 detectVideoProvider 判断）
├── 是 → 开始加载视频
│   ├── 加载中（0-3s）→ 骨架屏 shimmer 铺满卡片，信息面板居中叠在上方
│   ├── 加载成功（<3s）→ 视频背景播放（Vimeo iframe autoplay）
│   └── 超时（>3s）→ timedOut=true → 切换为轮播模式
└── 否（无视频 / YouTube / 超时）→ 直接轮播模式
```

**视频加载技术细节**：
- iframe 在骨架屏阶段就渲染到 DOM（`visibility: hidden`），避免 onLoad 死锁
- 视频加载成功后移除隐藏类，iframe 可见
- 超时后骨架屏和 iframe 一起移除，切换为轮播
- YouTube embed 参数：`autoplay=1&mute=1&loop=1&playlist={videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`

## 动态作品集索引
- 视频成功播放时：`galleryStart = 0`（前 3 张也纳入作品集）
- 轮播模式时：`galleryStart = 3`（前 3 张已在 Hero 轮播展示，不重复）

## 作品集"查看更多"按钮（3s 延迟出现）
- 点击后按钮立即消失，新图片开始加载（骨架屏）
- 加载完成后仍保持隐藏，直到点击后 3 秒才重新出现在底部
- 实现：`gallerySuppressUntil` 状态 + `galleryTick` 触发重渲染
- 如果没有更多内容，按钮不再出现

## 窄屏响应式（≤900px）
- 无论视频还是轮播，统一上下堆叠布局
- 视频区域：`position: relative; height: 55vh`（非全屏覆盖）
- 移除视频暗色遮罩
- 已预定状态背景色需要更高优先级选择器

---

## CSS 关键样式

样式文件：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`

| 类名 | 用途 |
|------|------|
| `.photo-hero` | Hero 区域容器 |
| `.photo-hero__card` | Hero 卡片（`position: relative`） |
| `.photo-hero__card--video` | 视频模式状态 |
| `.photo-hero__card--loading` | 加载状态（骨架屏可见） |
| `.photo-hero__skeleton` | 骨架屏容器（`absolute; inset: 0; z-index: 1`） |
| `.photo-hero__skeleton-shimmer` | shimmer 动画层 |
| `.photo-hero__video-bg` | 视频背景容器 |
| `.photo-hero__video-bg--hidden` | 视频加载阶段隐藏 |
| `.photo-hero__video-overlay` | 视频暗色遮罩 |
| `.photo-hero__carousel` | 轮播容器 |
| `.photo-hero__info` | 信息面板 |
| `.photo-hero__info--booked` | 已预定状态 |
| `.photo-hero__headshot` | 头像区域 |
| `.photo-booked-badge` | 已预定花环徽章 |
| `.photo-gallery__columns` | 作品集双列瀑布流 |
| `.photo-style__grid` | 摄影风格网格 |

### Shimmer 动画
```css
@keyframes photo-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
