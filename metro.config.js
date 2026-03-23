const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Windows에서 파일 감시 문제 해결 - 폴링 모드 사용
config.watchFolders = [__dirname];
config.watcher = {
  healthCheck: {
    enabled: true,
  },
  watchman: {
    deferStates: ['hg.update'],
  },
};

module.exports = config;
