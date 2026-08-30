/**
 * 通用 Junebug 摄影师提取脚本
 * 
 * 用法: node scripts/extract-junebug.cjs "<junebug-url>"
 * 示例: node scripts/extract-junebug.cjs "https://junebugweddings.com/vendors/wedding-photographers/switzerland/Eline-Tasma"
 * 
 * 输出:
 *   - 图片: Verra-Voile-Uploads/crawled/photographers/{slug}/
 *   - 数据: scripts/junebug-{slug}-data.json
 */

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

// ── 参数解析 ──
const PAGE_URL = process.argv[2]
if (!PAGE_URL) {
  console.error('用法: node scripts/extract-junebug.cjs "<junebug-url>"')
  process.exit(1)
}

// 从 URL 提取 slug（最后一段）
const urlParts = PAGE_URL.replace(/\/$/, '').split('/')
const SLUG_RAW = urlParts[urlParts.length - 1] // 保留原始大小写（如 Eline-Tasma）
const SLUG = SLUG_RAW.toLowerCase() // 小写 slug（如 eline-tasma）

// 图片保存目录（独立图片仓库）
const BASE_DIR = path.join('/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/photographers', SLUG)

console.log(`🎯 URL: ${PAGE_URL}`)
console.log(`📁 Slug: ${SLUG}`)
console.log(`📂 图片目录: ${BASE_DIR}`)
console.log('')

async function main() {
  fs.mkdirSync(BASE_DIR, { recursive: true })

  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  // ── 1. 拦截图片响应 ──
  const capturedBuffers = new Map() // pattern → buffer
  let headshotBuffer = null
  let headshotExt = 'png'

  page.on('response', async (response) => {
    const url = response.url()

    // 拦截作品集图片（images.junebugweddings.com）
    if (url.includes('images.junebugweddings.com/')) {
      const match = url.match(/images\.junebugweddings\.com\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/)
      if (!match) return
      const pattern = match[1]
      if (capturedBuffers.has(pattern)) return
      try {
        const buffer = await response.buffer()
        if (buffer.length < 5000) return // 跳过缩略图
        capturedBuffers.set(pattern, buffer)
      } catch (e) {}
    }

    // 拦截头像/logo（static.junebugweddings.com）
    if (url.includes('static.junebugweddings.com/') && (url.includes('headshot') || url.includes('logo'))) {
      try {
        const buffer = await response.buffer()
        if (buffer.length > 1000) {
          headshotBuffer = buffer
          headshotExt = url.includes('.png') ? 'png' : 'jpg'
        }
      } catch (e) {}
    }
  })

  // ── 2. 访问页面 ──
  console.log('⏳ 正在访问页面...')
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))
  console.log('✅ 页面加载完成')

  // ── 3. 提取 vendorAccountId ──
  const pageContent = await page.content()
  const acctMatch = pageContent.match(/vendorAccountId\s*=\s*(\d+)/)
  const acctMatch2 = pageContent.match(/acct(\d+)/)
  const accountId = acctMatch ? acctMatch[1] : (acctMatch2 ? acctMatch2[1] : null)
  console.log(`🔑 Account ID: ${accountId || '未找到'}`)

  // ── 4. 提取 DOM 数据 ──
  console.log('📝 提取页面数据...')
  const data = await page.evaluate(() => {
    // 名称
    const nameEl = document.querySelector('.vendor-profile__name, h1')
    const name = nameEl ? nameEl.textContent.trim() : ''

    // 宣传语
    const taglineEl = document.querySelector('.vendor-profile__tagline, .vendor-tagline')
    const tagline = taglineEl ? taglineEl.textContent.trim() : ''

    // 描述
    const descEl = document.querySelector('.vendor-profile__description, .vendor-description')
    const description = descEl ? descEl.textContent.trim() : ''

    // 摄影风格
    const styleEls = document.querySelectorAll('.vendor-profile__specialty-item, .vendor-specialties li')
    const photoStyles = [...styleEls].map(el => el.textContent.trim()).filter(Boolean)

    // 轮播图（vendor 展示照，最多 3 张）
    const slideImgs = [...document.querySelectorAll('.vendor__slide img, .vendor-carousel img')]
      .map(img => img.src)
      .filter(src => src && src.includes('images.junebugweddings.com'))
      .slice(0, 3)

    // 画廊图片
    const galleryImgs = [...document.querySelectorAll('.gallery__card img, .gallery img')]
      .map(img => img.src)
      .filter(src => src && src.includes('images.junebugweddings.com'))

    // 评价
    const reviewEls = document.querySelectorAll('.review__text, .vendor-review__text')
    const reviews = [...reviewEls].map(el => el.textContent.trim()).filter(Boolean).slice(0, 3)

    // 个人网站
    const website = (() => {
      const visitLink = document.querySelector('.see-website a, .vendor-links-row .see-website a')
      if (visitLink && visitLink.href && !visitLink.href.includes('junebugweddings')) {
        return visitLink.href.replace(/\/$/, '')
      }
      const links = document.querySelectorAll('a[href*="http"]:not([href*="junebugweddings"])')
      for (const a of links) {
        if (a.textContent.toLowerCase().includes('visit') && a.textContent.toLowerCase().includes('website')) {
          return a.href.replace(/\/$/, '')
        }
      }
      return null
    })()

    // 地点
    const locationEl = document.querySelector('.vendor-profile__location, .vendor-location')
    const location = locationEl ? locationEl.textContent.trim() : ''

    return { name, tagline, description, photoStyles, slideImgs, galleryImgs, reviews, website, location }
  })

  console.log(`  名称: ${data.name}`)
  console.log(`  位置: ${data.location}`)
  console.log(`  轮播图: ${data.slideImgs.length} 张`)
  console.log(`  画廊: ${data.galleryImgs.length} 张`)
  console.log(`  风格: ${data.photoStyles.join(', ') || '无'}`)
  console.log(`  网站: ${data.website || '无'}`)

  // ── 5. 滚动 + 点击 "View more +" 加载全部画廊 ──
  console.log('📜 加载全部画廊...')
  for (let round = 0; round < 15; round++) {
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('.load-more.is-visible')
      btns.forEach(b => b.click())
      return btns.length
    })
    if (clicked === 0) break
    await new Promise(r => setTimeout(r, 2000))
    process.stdout.write(`  第 ${round + 1} 轮: 点击了 ${clicked} 个按钮\n`)
  }

  // ── 6. 调用 AJAX API 获取完整作品集 ──
  let portfolioUrls = []
  if (accountId) {
    console.log('🖼️ 获取作品集 API...')
    portfolioUrls = await page.evaluate(async (acctId, slugRaw) => {
      const all = []
      for (let offset = 0; offset < 200; offset += 9) {
        const body = new URLSearchParams({ accountid: acctId, slug: slugRaw, offset: String(offset) })
        const resp = await fetch('/ajax/vendor/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
          body: body.toString()
        })
        const json = await resp.json()
        if (!json.images || json.images.length === 0) break
        json.images.forEach(img => {
          const raw = img.uri || (img.avifUri || '').replace(/_avif\.avif$/, '.jpg').replace(/\.avif$/, '.jpg')
          if (raw) all.push(raw)
        })
        if (json.images.length < 9) break
      }
      return [...new Set(all)]
    }, accountId, SLUG_RAW)
    console.log(`  作品集: ${portfolioUrls.length} 张 URL`)

    // ── 7. 获取视频 ──
    console.log('🎬 获取视频 API...')
    const videoData = await page.evaluate(async (acctId, slugRaw) => {
      const body = new URLSearchParams({ accountid: acctId, slug: slugRaw })
      const resp = await fetch('/ajax/vendor/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: body.toString()
      })
      return await resp.json()
    }, accountId, SLUG_RAW)

    // 仅保留 Vimeo 视频，YouTube 舍弃
    const allVideos = videoData.videos || videoData || []
    const vimeoVideos = Array.isArray(allVideos)
      ? allVideos.filter(v => {
          const provider = (v.provider || v.source || '').toLowerCase()
          const url = (v.url || v.uri || '').toLowerCase()
          return provider.includes('vimeo') || url.includes('vimeo')
        })
      : []
    const videoUrl = vimeoVideos.length > 0 ? (vimeoVideos[0].url || vimeoVideos[0].uri || '') : ''
    console.log(`  视频: ${Array.isArray(allVideos) ? allVideos.length : 0} 个总计, ${vimeoVideos.length} 个 Vimeo`)

    data.videoUrl = videoUrl
    data.allVideos = allVideos
  }

  await browser.close()
  console.log('\n✅ 浏览器已关闭')

  // ── 8. 整理图片顺序并保存 ──
  console.log('\n💾 保存图片...')

  // 收集所有图片 URL 对应的 pattern
  const slidePatterns = data.slideImgs
    .map(url => {
      const m = url.match(/images\.junebugweddings\.com\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/)
      return m ? m[1] : null
    })
    .filter(Boolean)

  const galleryPatterns = data.galleryImgs
    .map(url => {
      const m = url.match(/images\.junebugweddings\.com\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/)
      return m ? m[1] : null
    })
    .filter(Boolean)

  const portfolioPatterns = portfolioUrls
    .map(url => {
      const m = url.match(/images\.junebugweddings\.com\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/)
      return m ? m[1] : null
    })
    .filter(Boolean)

  // 按顺序合并去重：轮播图 → 画廊 → 作品集
  const orderedPatterns = []
  const seen = new Set()

  // 先放轮播图（前3张）
  for (const p of slidePatterns) {
    if (!seen.has(p) && capturedBuffers.has(p)) {
      orderedPatterns.push(p)
      seen.add(p)
    }
  }
  // 再放画廊
  for (const p of galleryPatterns) {
    if (!seen.has(p) && capturedBuffers.has(p)) {
      orderedPatterns.push(p)
      seen.add(p)
    }
  }
  // 最后放作品集
  for (const p of portfolioPatterns) {
    if (!seen.has(p) && capturedBuffers.has(p)) {
      orderedPatterns.push(p)
      seen.add(p)
    }
  }
  // 剩余拦截到的图片（可能有些没在页面链接中但被拦截到）
  for (const [p] of capturedBuffers) {
    if (!seen.has(p)) {
      orderedPatterns.push(p)
      seen.add(p)
    }
  }

  // 写入文件
  let savedCount = 0
  for (let i = 0; i < orderedPatterns.length; i++) {
    const pattern = orderedPatterns[i]
    const buffer = capturedBuffers.get(pattern)
    if (!buffer) continue
    const filename = `${String(i).padStart(2, '0')}.jpg`
    fs.writeFileSync(path.join(BASE_DIR, filename), buffer)
    savedCount++
  }
  console.log(`  保存了 ${savedCount} 张作品集图片`)

  // 保存 headshot
  let headshotPath = ''
  if (headshotBuffer) {
    headshotPath = `/uploads/crawled/photographers/${SLUG}/headshot.${headshotExt}`
    fs.writeFileSync(path.join(BASE_DIR, `headshot.${headshotExt}`), headshotBuffer)
    console.log(`  保存了 headshot.${headshotExt}`)
  } else {
    console.log('  ⚠️ 未找到 headshot/logo')
  }

  // ── 9. 生成输出数据 ──
  const images = []
  for (let i = 0; i < orderedPatterns.length; i++) {
    images.push(`/uploads/crawled/photographers/${SLUG}/${String(i).padStart(2, '0')}.jpg`)
  }

  const output = {
    slug: SLUG,
    slugRaw: SLUG_RAW,
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    photoStyles: data.photoStyles,
    location: data.location,
    website: data.website,
    videoUrl: data.videoUrl || '',
    coverImage: images[0] || '',
    headshot: headshotPath,
    images,
    reviews: data.reviews,
    sourceUrl: PAGE_URL,
    sourceName: 'Junebug Weddings',
    imgCount: images.length,
  }

  const outputPath = path.join(__dirname, `junebug-${SLUG}-data.json`)
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\n📄 数据已保存: ${outputPath}`)

  // ── 10. 输出摘要 ──
  console.log('\n═══════════════════════════════════')
  console.log(`✅ ${data.name} (${SLUG})`)
  console.log(`   图片: ${images.length} 张`)
  console.log(`   头像: ${headshotPath || '无'}`)
  console.log(`   视频: ${data.videoUrl || '无'}`)
  console.log(`   网站: ${data.website || '无'}`)
  console.log(`   风格: ${data.photoStyles.length} 个标签`)
  console.log('═══════════════════════════════════')
}

main().catch(err => {
  console.error('❌ 错误:', err.message)
  process.exit(1)
})
