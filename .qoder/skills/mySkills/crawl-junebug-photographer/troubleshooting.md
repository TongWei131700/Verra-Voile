# 摄影师爬取踩坑记录

> 本文件从 SKILL.md 拆分而出，仅在遇到问题时读取。

## Cloudflare 防护下 curl/WebFetch 全部失败
**问题**：Junebug 有 Cloudflare 防护，curl 返回 challenge 页面，WebFetch 返回 403。
**解决**：必须用 Puppeteer 通过 JS Challenge，然后通过 `page.on('response')` 拦截图片 buffer，通过 `page.evaluate(fetch(...))` 调用 AJAX API。

## 头像/Logo 远程 URL 被 Cloudflare 拦截
**问题**：`static.junebugweddings.com` 也有 Cloudflare 防护，存远程 URL 后前端加载返回 403。
**解决**：必须用 Puppeteer 拦截 `static.junebugweddings.com` 的 response buffer 下载到本地，数据库存本地路径 `/uploads/crawled/photographers/{slug}/headshot.png`。

## 仅修改静态文件不会生效，必须插入数据库
**问题**：数据已从静态 TS 文件迁移到数据库架构，仅修改 `junebugPhotographers.ts` 不会在页面显示。
**解决**：必须编写 `insert-{slug}.cjs` 写入 `crawled_photographers` 表，同时确保图片已 commit 到图片仓库。

## iframe 条件渲染导致加载死锁
**问题**：iframe 只在 `videoLoaded=true` 时渲染，但 `videoLoaded` 依赖 iframe 的 `onLoad` → 永远无法加载。
**解决**：iframe 始终渲染在 DOM 中，加载阶段用 `photo-hero__video-bg--hidden`（`width:0; height:0; overflow:hidden`）隐藏，iframe 设 `visibility: hidden`。

## CSS 选择器优先级导致已预定背景不生效
**问题**：`.photo-hero__card--video .photo-hero__info`（0,2,0）与 `.photo-hero__info--booked`（0,2,0）优先级相同，后者被覆盖。
**解决**：添加更高优先级选择器 `.photo-hero__card--video .photo-hero__info--booked`（0,3,0）。

## 骨架屏覆盖方式演变
**初始**：骨架屏在 video-bg 内部作为 flex 子元素 → 左右分栏
**第二版**：`absolute; inset: 0; z-index: 10` 覆盖整个卡片 → 信息面板被遮挡
**最终**：骨架屏 `absolute` 铺满（z-index:1），信息面板 `relative; z-index: 2; background: transparent` 居中叠在上方

## 页面静态图片只有 3 张
Junebug HTML 只含 3 张 vendor 展示照（`.vendor__slide`），其余通过 JS 动态加载。必须滚动 + 点击 `.load-more.is-visible` 加载全部画廊。

## AJAX API 返回的 avifUri 带 _avif 后缀
**问题**：`avifUri` 形如 `.../hash_avif.avif`，仅替换扩展名为 `.jpg` 后路径不存在（404）。
**解决**：优先使用 `img.uri`（不带 `_avif`）；若只有 `avifUri`，必须同时去掉 `_avif` 路径段：`url.replace(/_avif\.avif$/, '.jpg')`。
