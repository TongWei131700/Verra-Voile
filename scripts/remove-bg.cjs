// 从图片边缘泛洪去除近白色背景，输出透明底 PNG
const sharp = require('/Users/hongli/WorkSpace/Verra-Voile-End/node_modules/sharp');

const INPUT = process.argv[2];
const OUTPUT = process.argv[3];
const TOL = Number(process.argv[4] || 48); // 与白色的容差

const distToWhite = (r, g, b) =>
  Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

(async () => {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const n = width * height;
  const visited = new Uint8Array(n);
  const queue = [];

  const idx = (x, y) => y * width + x;
  const nearWhite = (x, y) => {
    const i = (y * width + x) * channels;
    return distToWhite(data[i], data[i + 1], data[i + 2]) < TOL;
  };

  // 种子：四条边上接近白色的像素
  for (let x = 0; x < width; x++) {
    if (nearWhite(x, 0)) queue.push(idx(x, 0));
    if (nearWhite(x, height - 1)) queue.push(idx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    if (nearWhite(0, y)) queue.push(idx(0, y));
    if (nearWhite(width - 1, y)) queue.push(idx(width - 1, y));
  }

  // BFS 泛洪
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    if (visited[p]) continue;
    visited[p] = 1;
    const x = p % width;
    const y = (p / width) | 0;
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const np = idx(nx, ny);
      if (!visited[np] && nearWhite(nx, ny)) queue.push(np);
    }
  }

  // 将泛洪区域设为透明
  let removed = 0;
  for (let p = 0; p < n; p++) {
    if (visited[p]) {
      data[p * channels + 3] = 0;
      removed++;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT);

  console.log(`完成: ${OUTPUT}, 移除像素 ${removed}/${n} (${(removed / n * 100).toFixed(1)}%)`);
})();
