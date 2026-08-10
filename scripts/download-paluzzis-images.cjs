/**
 * 下载 Paluzzis - Wedding Memories 摄影师图片到本地
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const SLUG = 'paluzzis-wedding-memories'
const DEST = path.join(__dirname, '../uploads/crawled/photographers', SLUG)

if (!fs.existsSync(DEST)) {
  fs.mkdirSync(DEST, { recursive: true })
}

// 3 张 vendor 展示照（avif → jpg）
const vendorPhotos = [
  'https://images.junebugweddings.com/1a/43/1a43944b9a560e65.jpg',
  'https://images.junebugweddings.com/56/9c/569c669e187ca245.jpg',
  'https://images.junebugweddings.com/61/ff/61ff4533633dca30.jpg',
]

// 25 张作品集
const portfolioPhotos = [
  'https://images.junebugweddings.com/74/0a/740a5acdbd27777c.jpg',
  'https://images.junebugweddings.com/fd/b1/fdb18ac3e5ba00b9.jpg',
  'https://images.junebugweddings.com/25/cc/25cc760b93a486e4.jpg',
  'https://images.junebugweddings.com/ea/b6/eab6e0a4530c8302.jpg',
  'https://images.junebugweddings.com/de/cd/decd0daa9700dccb.jpg',
  'https://images.junebugweddings.com/73/e4/73e4b28eac77a63e.jpg',
  'https://images.junebugweddings.com/68/36/683621e0e913089c.jpg',
  'https://images.junebugweddings.com/d9/59/d959f69829835ba0.jpg',
  'https://images.junebugweddings.com/45/bb/45bbf6a3e855355b.jpg',
  'https://images.junebugweddings.com/11/d6/11d6c4cecaa75588.jpg',
  'https://images.junebugweddings.com/8e/77/8e7779b7b8a11ce6.jpg',
  'https://images.junebugweddings.com/75/ed/75edf9a331d4c1bb.jpg',
  'https://images.junebugweddings.com/88/f5/88f5655c08c194db.jpg',
  'https://images.junebugweddings.com/c2/a9/c2a958a30ab96ab2.jpg',
  'https://images.junebugweddings.com/58/cb/58cb709c1d308ec2.jpg',
  'https://images.junebugweddings.com/7c/e9/7ce96fe83042a9b8.jpg',
  'https://images.junebugweddings.com/7f/5e/7f5e09358f17b9de.jpg',
  'https://images.junebugweddings.com/8c/89/8c8987dd0c21cbc3.jpg',
  'https://images.junebugweddings.com/e9/b7/e9b7313af585cad8.jpg',
  'https://images.junebugweddings.com/16/8e/168e34193eb6f8c6.jpg',
  'https://images.junebugweddings.com/37/0d/370d8366b9da522c.jpg',
  'https://images.junebugweddings.com/8f/35/8f35a2a10b12b42c.jpg',
  'https://images.junebugweddings.com/a4/aa/a4aa8ac17ff74805.jpg',
  'https://images.junebugweddings.com/50/37/50376b06dcaf81e7.jpg',
]

// 头像
const headshot = 'https://static.junebugweddings.com/hotlists/acct7044/headshot/Paluzzis---Wedding-Memories-headshot-20260605-8603bb9753.jpg'

// 合并所有图片：展示照在前，作品集在后（去重）
const allPhotos = []
const seen = new Set()
for (const url of [...vendorPhotos, ...portfolioPhotos]) {
  if (!seen.has(url)) {
    seen.add(url)
    allPhotos.push(url)
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://junebugweddings.com/',
      },
    }, (res) => {
      if ([301, 302].includes(res.statusCode)) {
        https.get(res.headers.location, (r2) => {
          r2.pipe(file)
          file.on('finish', () => { file.close(); resolve() })
        }).on('error', (e) => { fs.unlink(dest, () => {}); reject(e) })
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (e) => { fs.unlink(dest, () => {}); reject(e) })
  })
}

async function main() {
  let success = 0, fail = 0

  // 下载作品图片
  for (let i = 0; i < allPhotos.length; i++) {
    const url = allPhotos[i]
    const hash = url.match(/\/([a-f0-9]+)_avif/)?.[1] || `img-${i}`
    const prefix = i < 3 ? `00_${hash}` : `${String(i).padStart(2, '0')}_${hash}`
    const filename = `${prefix}.jpg`
    const dest = path.join(DEST, filename)

    if (fs.existsSync(dest)) {
      console.log(`[跳过] ${filename}`)
      success++
      continue
    }

    try {
      await download(url, dest)
      const size = fs.statSync(dest).size
      console.log(`[下载] ${filename} (${(size / 1024).toFixed(1)} KB)`)
      success++
    } catch (err) {
      console.error(`[失败] ${filename}: ${err.message}`)
      fail++
    }
  }

  // 下载头像
  const headshotDest = path.join(DEST, 'headshot.jpg')
  if (!fs.existsSync(headshotDest)) {
    try {
      await download(headshot, headshotDest)
      console.log(`[下载] headshot.jpg`)
      success++
    } catch (err) {
      console.error(`[失败] headshot.jpg: ${err.message}`)
      fail++
    }
  } else {
    console.log('[跳过] headshot.jpg')
    success++
  }

  console.log(`\n完成: ${success} 成功, ${fail} 失败`)
  console.log(`目录: ${DEST}`)

  // 输出本地路径列表（供数据文件使用）
  console.log('\n--- 本地路径（用于数据文件） ---')
  const LOCAL = `/uploads/crawled/photographers/${SLUG}`
  const files = fs.readdirSync(DEST).filter(f => f.endsWith('.jpg')).sort()
  console.log(`cover: \`${LOCAL}/${files.find(f => f.startsWith('00_'))}\`,`)
  console.log('images: [')
  for (const f of files) {
    if (f === 'headshot.jpg') continue
    console.log(`  \`${LOCAL}/${f}\`,`)
  }
  console.log('],')
  console.log(`headshot: \`${LOCAL}/headshot.jpg\`,`)
}

main()
