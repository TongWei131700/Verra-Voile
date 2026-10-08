/**
 * 小红书目的地婚礼/旅拍 自动搜索截图脚本
 * 
 * 运行环境：AutoX.js (Auto.js 开源分支)
 * 下载地址：https://github.com/kkevsekk1/AutoX/releases
 * 推荐版本：6.x 以上
 * 
 * 使用前准备：
 * 1. 安装 AutoX.js 并授予「无障碍服务」权限
 * 2. 授予「存储」权限（用于保存截图）
 * 3. 授予「悬浮窗」权限（用于显示运行状态）
 * 4. 手机已登录小红书账号
 * 5. 在 AutoX.js 设置中关闭「省电优化」（防止后台被杀）
 * 
 * 使用方式：
 * 打开 AutoX.js → 导入此脚本 → 点击运行
 */

"auto";  // 自动开启无障碍服务

// ==================== 配置区 ====================
const CONFIG = {
    // 搜索关键词列表（会依次搜索每个关键词）
    keywords: [
        "目的地婚礼",
        "三亚目的地婚礼",
        "大理目的地婚礼",
        "旅拍推荐",
        "三亚旅拍",
        "丽江旅拍",
        "新疆目的地婚礼",
    ],

    // 每个关键词搜索后，滑动截图的页数
    scrollPages: 5,

    // 是否进入帖子详情页截图
    enterPostDetail: true,

    // 每个关键词下，进入几个帖子详情
    postsPerKeyword: 3,

    // 截图保存路径
    savePath: "/sdcard/xhs_screenshots/",

    // ===== 防检测参数（随机化） =====
    // 操作间隔范围（毫秒）
    minDelay: 1500,
    maxDelay: 4000,

    // 滑动后等待加载的时间范围
    minScrollWait: 2000,
    maxScrollWait: 4500,

    // 点击坐标随机偏移范围（像素）
    clickOffset: 15,

    // 帖子详情页停留时间范围
    minDetailStay: 5000,
    maxDetailStay: 12000,

    // 每个关键词之间的等待时间范围
    minKeywordGap: 8000,
    maxKeywordGap: 15000,
};

// ==================== 工具函数 ====================

/**
 * 生成 min 到 max 之间的随机整数
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机等待（模拟人类操作的不规律节奏）
 */
function randomSleep(min, max) {
    if (max === undefined) {
        max = min;
        min = 0;
    }
    var ms = randomInt(min, max);
    sleep(ms);
}

/**
 * 带随机偏移的点击（避免每次点击同一像素点）
 */
function randomClick(x, y) {
    var ox = x + randomInt(-CONFIG.clickOffset, CONFIG.clickOffset);
    var oy = y + randomInt(-CONFIG.clickOffset, CONFIG.clickOffset);
    click(ox, oy);
    randomSleep(300, 800);
}

/**
 * 模拟人类滑动（非匀速，带加减速）
 */
function humanSwipe(startX, startY, endX, endY) {
    // 添加随机偏移
    startX += randomInt(-10, 10);
    startY += randomInt(-5, 5);
    endX += randomInt(-10, 10);
    endY += randomInt(-5, 5);

    var duration = randomInt(300, 700);
    swipe(startX, startY, endX, endY, duration);
}

/**
 * 截取屏幕并保存
 * @param {string} tag - 截图标签（用于文件命名）
 * @param {string} keyword - 当前搜索关键词
 * @param {number} index - 序号
 */
function takeScreenshot(tag, keyword, index) {
    var safeKeyword = keyword.replace(/[\s\/\\:*?"<>|]/g, "_");
    var timestamp = new Date().getTime();
    var fileName = CONFIG.savePath + safeKeyword + "/" + tag + "_" + index + "_" + timestamp + ".png";

    // 确保目录存在
    var dir = CONFIG.savePath + safeKeyword;
    files.ensureDir(dir + "/");

    // 截图
    var img = captureScreen();
    if (img) {
        img.saveTo(fileName);
        img.recycle();
        console.log("[截图成功] " + fileName);
        return fileName;
    } else {
        console.error("[截图失败]");
        return null;
    }
}

/**
 * 等待某个文本出现（带超时）
 * @param {string} text - 要等待的文本
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {boolean}
 */
function waitForText(text, timeout) {
    timeout = timeout || 10000;
    var start = new Date().getTime();
    while (new Date().getTime() - start < timeout) {
        if (text(text).findOnce()) {
            return true;
        }
        sleep(500);
    }
    return false;
}

/**
 * 安全返回上一页
 */
function safeGoBack() {
    back();
    randomSleep(1000, 2000);
}

// ==================== 核心流程 ====================

/**
 * 启动小红书
 */
function launchXHS() {
    console.log("[步骤] 启动小红书...");

    // 先尝试唤醒屏幕
    device.wakeUpIfNeeded();
    sleep(1000);

    // 启动 App
    launchApp("小红书");
    sleep(5000);

    // 检查是否成功启动（检测底部导航栏的「首页」或「搜索」）
    if (!waitForText("首页", 8000) && !waitForText("搜索", 8000)) {
        // 可能小红书没安装或需要更新
        console.error("[错误] 小红书未启动成功，请确认已安装并登录");
        toast("小红书启动失败，请检查");
        exit();
    }

    console.log("[完成] 小红书已启动");
    randomSleep(2000, 3000);
}

/**
 * 执行搜索
 * @param {string} keyword - 搜索关键词
 */
function doSearch(keyword) {
    console.log("[步骤] 搜索关键词: " + keyword);

    // 方式1：尝试点击底部导航栏的「搜索」
    var searchTab = text("搜索").findOnce()
        || desc("搜索").findOnce();

    if (searchTab) {
        var bounds = searchTab.bounds();
        randomClick(bounds.centerX(), bounds.centerY());
    } else {
        // 方式2：直接点击顶部搜索图标
        var searchIcon = id("search_icon").findOnce()
            || descContains("搜索").findOnce();
        if (searchIcon) {
            var bounds = searchIcon.bounds();
            randomClick(bounds.centerX(), bounds.centerY());
        }
    }

    randomSleep(1500, 2500);

    // 找到搜索输入框
    var searchInput = className("EditText").findOnce();
    if (!searchInput) {
        // 备用：通过文本查找
        searchInput = text("搜索小红书").findOnce()
            || text("搜索").findOnce();
    }

    if (!searchInput) {
        console.error("[错误] 未找到搜索输入框");
        return false;
    }

    // 点击输入框并输入关键词
    var inputBounds = searchInput.bounds();
    randomClick(inputBounds.centerX(), inputBounds.centerY());
    randomSleep(500, 1000);

    // 清空输入框（全选后删除）
    setText("");
    randomSleep(300, 500);

    // 逐字输入关键词（模拟人类打字）
    for (var i = 0; i < keyword.length; i++) {
        var char = keyword.charAt(i);
        // 使用 setText 逐步追加
        var currentText = searchInput.text() || "";
        setText(currentText + char);
        randomSleep(100, 300);
    }

    randomSleep(1000, 2000);

    // 点击搜索按钮（键盘上的搜索键 或 页面搜索按钮）
    var searchBtn = text("搜索").findOnce();
    if (searchBtn) {
        var btnBounds = searchBtn.bounds();
        randomClick(btnBounds.centerX(), btnBounds.centerY());
    } else {
        // 尝试用 KeyCode 模拟键盘搜索键
        KeyEvent("KEYCODE_ENTER");
    }

    // 等待搜索结果加载
    randomSleep(CONFIG.minScrollWait, CONFIG.maxScrollWait);

    console.log("[完成] 搜索 \"" + keyword + "\" 结果已加载");
    return true;
}

/**
 * 滑动浏览并截图
 * @param {string} keyword - 当前关键词
 */
function scrollAndCapture(keyword) {
    console.log("[步骤] 开始滑动截图...");

    var deviceW = device.width;
    var deviceH = device.height;

    // 获取屏幕尺寸
    if (!deviceW || !deviceH) {
        deviceW = 1080;
        deviceH = 2400;
        console.log("[提示] 使用默认屏幕尺寸: " + deviceW + "x" + deviceH);
    }

    // 滑动参数
    var swipeStartX = deviceW / 2 + randomInt(-20, 20);
    var swipeStartY = deviceH * 0.75;
    var swipeEndY = deviceH * 0.25;

    // 先截第一屏
    takeScreenshot("feed", keyword, 0);
    randomSleep(1000, 2000);

    // 逐页滑动截图
    for (var i = 1; i <= CONFIG.scrollPages; i++) {
        console.log("[截图] 第 " + i + "/" + CONFIG.scrollPages + " 页");

        // 模拟人类滑动
        humanSwipe(swipeStartX, swipeStartY, swipeStartX, swipeEndY);

        // 等待内容加载
        randomSleep(CONFIG.minScrollWait, CONFIG.maxScrollWait);

        // 截图
        takeScreenshot("feed", keyword, i);

        // 页面间随机等待
        randomSleep(1000, 3000);
    }

    console.log("[完成] 滑动截图完成，共 " + (CONFIG.scrollPages + 1) + " 张");
}

/**
 * 进入帖子详情并截图
 * @param {string} keyword - 当前关键词
 */
function enterPostsAndCapture(keyword) {
    if (!CONFIG.enterPostDetail) return;

    console.log("[步骤] 进入帖子详情截图...");

    var deviceW = device.width || 1080;
    var deviceH = device.height || 2400;

    // 先回到搜索结果顶部
    var topPos = text("搜索").findOnce();
    if (topPos) {
        // 双击顶部回到顶部（小红书行为）
        randomClick(deviceW / 2, 100);
        randomSleep(500, 1000);
    }

    // 尝试找到帖子卡片（通常是包含图片的网格项）
    // 小红书的搜索结果通常是双列瀑布流
    for (var i = 0; i < CONFIG.postsPerKeyword; i++) {
        console.log("[详情] 进入第 " + (i + 1) + " 个帖子");

        // 查找可点击的笔记卡片
        // 小红书笔记卡片通常有 ImageView 或特定的 id
        var postCards = className("ImageView").find();

        if (!postCards || postCards.length < 2) {
            console.log("[提示] 未找到足够的帖子卡片，跳过详情截图");
            break;
        }

        // 选择第 i 个帖子（跳过可能存在的广告位）
        var cardIndex = Math.min(i * 2 + 2, postCards.length - 1);
        var card = postCards[cardIndex];

        if (!card) break;

        var cardBounds = card.bounds();

        // 点击帖子卡片进入详情
        randomClick(cardBounds.centerX(), cardBounds.centerY());
        randomSleep(2000, 3000);

        // 在帖子详情页截图
        takeScreenshot("detail", keyword, i);

        // 详情页内滑动查看更多内容
        randomSleep(1000, 2000);
        humanSwipe(deviceW / 2, deviceH * 0.7, deviceW / 2, deviceH * 0.3);
        randomSleep(1500, 2500);
        takeScreenshot("detail_scroll", keyword, i);

        // 停留一段时间（模拟阅读）
        randomSleep(CONFIG.minDetailStay, CONFIG.maxDetailStay);

        // 返回搜索结果
        safeGoBack();
        randomSleep(1500, 3000);
    }

    console.log("[完成] 帖子详情截图完成");
}

// ==================== 主流程 ====================

function main() {
    console.show();
    console.log("========================================");
    console.log("  小红书目的地婚礼/旅拍 自动搜索截图");
    console.log("========================================");
    console.log("");

    // 1. 创建截图保存目录
    files.ensureDir(CONFIG.savePath);
    console.log("[准备] 截图保存路径: " + CONFIG.savePath);

    // 2. 启动小红书
    launchXHS();

    // 3. 记录开始时间
    var startTime = new Date().getTime();
    var totalScreenshots = 0;

    // 4. 依次搜索每个关键词
    for (var k = 0; k < CONFIG.keywords.length; k++) {
        var keyword = CONFIG.keywords[k];
        console.log("");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("  关键词 [" + (k + 1) + "/" + CONFIG.keywords.length + "]: " + keyword);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // 搜索
        var success = doSearch(keyword);
        if (!success) {
            console.error("[跳过] 搜索失败，尝试下一个关键词");
            continue;
        }

        // 滑动截图
        scrollAndCapture(keyword);

        // 进入帖子详情截图
        enterPostsAndCapture(keyword);

        // 统计截图数
        var safeKeyword = keyword.replace(/[\s\/\\:*?"<>|]/g, "_");
        var files_in_dir = files.listDir(CONFIG.savePath + safeKeyword);
        if (files_in_dir) {
            totalScreenshots += files_in_dir.length;
        }

        // 关键词之间等待（模拟人类节奏）
        if (k < CONFIG.keywords.length - 1) {
            var gap = randomInt(CONFIG.minKeywordGap, CONFIG.maxKeywordGap);
            console.log("[等待] 下一个关键词，等待 " + (gap / 1000).toFixed(1) + " 秒...");
            sleep(gap);
        }
    }

    // 5. 输出汇总
    var elapsed = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(1);
    console.log("");
    console.log("========================================");
    console.log("  执行完成!");
    console.log("  总耗时: " + elapsed + " 分钟");
    console.log("  总截图: ~" + totalScreenshots + " 张");
    console.log("  保存路径: " + CONFIG.savePath);
    console.log("========================================");

    toast("脚本执行完成！共截图约 " + totalScreenshots + " 张");

    // 6. 生成汇总文件
    var summary = {
        runTime: new Date().toLocaleString(),
        elapsed: elapsed + " 分钟",
        keywords: CONFIG.keywords,
        totalScreenshots: totalScreenshots,
        savePath: CONFIG.savePath,
    };
    files.write(CONFIG.savePath + "run_summary.json", JSON.stringify(summary, null, 2));
    console.log("[完成] 汇总信息已保存到 run_summary.json");
}

// ==================== 异常处理 ====================

try {
    main();
} catch (e) {
    console.error("[异常] " + e.message);
    console.error(e.stack);
    toast("脚本异常: " + e.message);

    // 异常截图（记录当前屏幕状态，便于排查）
    try {
        takeScreenshot("error", "exception", 0);
    } catch (e2) {
        // 忽略截图失败
    }
}
