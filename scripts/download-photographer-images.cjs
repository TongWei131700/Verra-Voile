/**
 * 下载摄影师图片到本地
 * 
 * 功能：
 * 1. 从 junebugPhotographers.ts 提取所有外部图片 URL
 * 2. 下载到 uploads/crawled/photographers/{slug}/ 目录
 * 3. 生成 URL → 本地路径映射 JSON
 * 4. 自动更新 junebugPhotographers.ts 中的图片路径
 * 
 * 用法: node scripts/download-photographer-images.cjs
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'crawled', 'photographers')
const DATA_FILE = path.join(__dirname, '..', 'src', 'data', 'junebugPhotographers.ts')
const MAPPING_FILE = path.join(__dirname, 'photographer-image-mapping.json')

// 确保目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// 下载单个图片
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(outputPath)) {
      resolve({ skipped: true })
      return
    }
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 重定向
        downloadImage(res.headers.location, outputPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const writeStream = fs.createWriteStream(outputPath)
      res.pipe(writeStream)
      writeStream.on('finish', () => resolve({ skipped: false }))
      writeStream.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout for ${url}`)) })
  })
}

// 从 URL 生成本地文件名
function getFilename(url, index) {
  const parsed = new URL(url)
  const ext = path.extname(parsed.pathname) || '.jpg'
  const base = path.basename(parsed.pathname, ext).slice(0, 40)
  return `${String(index).padStart(2, '0')}_${base}${ext}`
}

// 从 TS 文件中提取所有外部图片 URL
function extractUrls() {
  const content = fs.readFileSync(DATA_FILE, 'utf-8')
  const urls = new Set()
  
  // 匹配模板字符串中的 URL: `${IMG}/xx/xx.jpg`
  const templateMatches = content.matchAll(/\$\{IMG\}(\/[^`]+\.jpg)/g)
  for (const m of templateMatches) {
    urls.add(`https://images.junebugweddings.com${m[1]}`)
  }
  
  // 匹配直接字符串 URL
  const directMatches = content.matchAll(/'(https?:\/\/[^']+\.(jpg|jpeg|png|webp))'/g)
  for (const m of directMatches) {
    urls.add(m[1])
  }
  
  return [...urls]
}

// 主流程
async function main() {
  console.log('📷 开始下载摄影师图片...\n')
  
  // 读取数据文件，提取摄影师 slug 列表和图片
  const content = fs.readFileSync(DATA_FILE, 'utf-8')
  
  // 解析每个摄影师的 slug 和对应 URL
  const photographers = []
  const slugRegex = /slug:\s*'([^']+)'/g
  let match
  const slugs = []
  while ((match = slugRegex.exec(content)) !== null) {
    slugs.push(match[1])
  }
  
  // 提取所有 URL
  const allUrls = extractUrls()
  console.log(`找到 ${allUrls.length} 个唯一图片 URL，${slugs.length} 位摄影师\n`)
  
  // 按摄影师分目录下载
  // 先建立 slug → 目录映射，然后逐个摄影师处理
  const mapping = {} // url → local path
  let totalDownloaded = 0
  let totalSkipped = 0
  let totalFailed = 0
  
  for (const slug of slugs) {
    const slugDir = path.join(UPLOADS_DIR, slug)
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true })
    }
    
    // 找到该摄影师相关的 URL（通过 slug 在文件中的位置判断）
    // 简单方式：提取该摄影师块中的所有 URL
    const slugIdx = content.indexOf(`slug: '${slug}'`)
    const nextSlugIdx = content.indexOf("slug: '", slugIdx + 1)
    const block = nextSlugIdx > 0 ? content.slice(slugIdx, nextSlugIdx) : content.slice(slugIdx)
    
    const blockUrls = []
    // 模板字符串
    const tmplMatches = block.matchAll(/\$\{IMG\}(\/[^`]+\.jpg)/g)
    for (const m of tmplMatches) {
      blockUrls.push(`https://images.junebugweddings.com${m[1]}`)
    }
    // 直接 URL
    const directMatches = block.matchAll(/'(https?:\/\/[^']+\.(jpg|jpeg|png|webp))'/g)
    for (const m of directMatches) {
      blockUrls.push(m[1])
    }
    
    // 去重
    const uniqueUrls = [...new Set(blockUrls)]
    console.log(`\n📁 ${slug}: ${uniqueUrls.length} 张图片`)
    
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i]
      const filename = getFilename(url, i)
      const outputPath = path.join(slugDir, filename)
      const localPath = `/uploads/crawled/photographers/${slug}/${filename}`
      
      mapping[url] = localPath
      
      try {
        const result = await downloadImage(url, outputPath)
        if (result.skipped) {
          totalSkipped++
          process.stdout.write('  ⏭')
        } else {
          totalDownloaded++
          process.stdout.write('  ✓')
        }
      } catch (err) {
        totalFailed++
        process.stdout.write(`  ✗ ${err.message}`)
      }
      
      // 每 10 个换行
      if ((i + 1) % 10 === 0) console.log()
    }
    console.log()
  }
  
  console.log(`\n\n📊 下载统计:`)
  console.log(`  ✓ 新下载: ${totalDownloaded}`)
  console.log(`  ⏭ 已存在: ${totalSkipped}`)
  console.log(`  ✗ 失败: ${totalFailed}`)
  
  // 保存映射文件
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2))
  console.log(`\n💾 映射文件已保存: ${MAPPING_FILE}`)
  
  // 更新 TS 数据文件
  console.log('\n📝 更新 junebugPhotographers.ts ...')
  let updatedContent = content
  
  // 替换 IMG 常量定义为本地路径前缀（不再需要）
  // 替换所有 `${IMG}/xx/xx.jpg` 为本地路径
  updatedContent = updatedContent.replace(
    /\$\{IMG\}(\/[^`]+\.jpg)/g,
    (fullMatch, imgPath) => {
      const fullUrl = `https://images.junebugweddings.com${imgPath}`
      const localPath = mapping[fullUrl]
      if (localPath) {
        return `\${LOCAL}${localPath.replace('/uploads/crawled/photographers/', '/')}`
      }
      return fullMatch
    }
  )
  
  // 替换直接 URL 字符串（headshot、photomoonlight 等）
  for (const [url, localPath] of Object.entries(mapping)) {
    if (url.includes('junebugweddings.com') && url.includes('/hotlists/')) {
      // headshot URL
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      updatedContent = updatedContent.replace(
        new RegExp(`'${escaped}'`, 'g'),
        `'${localPath}'`
      )
    } else if (!url.includes('images.junebugweddings.com')) {
      // 非 junebug images 域名的（如 photomoonlight.com）
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      updatedContent = updatedContent.replace(
        new RegExp(`'${escaped}'`, 'g'),
        `'${localPath}'`
      )
    }
  }
  
  // 更新 IMG 常量为 LOCAL
  updatedContent = updatedContent.replace(
    "const IMG = 'https://images.junebugweddings.com'",
    "const LOCAL = '/uploads/crawled/photographers'"
  )
  
  fs.writeFileSync(DATA_FILE, updatedContent)
  console.log('✅ 数据文件已更新！')
}

main().catch(err => {
  console.error('❌ 错误:', err.message)
  process.exit(1)
})
