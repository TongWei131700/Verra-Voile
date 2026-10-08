import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.europewedding.app',
  appName: '欧婚纪',
  webDir: 'dist',
  server: {
    // 允许 HTTP 混合内容（部分外部图片资源为 HTTP）
    cleartext: true,
  },
  ios: {
    scheme: '欧婚纪',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: false,
    },
    StatusBar: {
      // 状态栏样式：深色背景 + 浅色文字
      style: 'LIGHT',
      backgroundColor: '#1a1a1a',
    },
    Keyboard: {
      // 键盘弹出时自动调整页面
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
