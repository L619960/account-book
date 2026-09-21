# 小浪出品 · 个人记账本

一个基于 Vue 3 的轻量级记账应用，支持桌面端和移动端，数据本地存储，隐私安全。

## 在线体验

**手机/电脑浏览器直接访问：** https://l619960.github.io/xiaolang/

> 添加到主屏幕即可像原生 App 一样使用。

## 功能特性

### 记账
- ✅ 收支记录（添加、编辑、删除）
- ✅ 分类管理（自定义分类、Emoji 图标）
- ✅ 账单列表（按月份、收支类型筛选）
- ✅ 日期选择
- ✅ 备注

### 统计
- ✅ 月度收支概览
- ✅ 支出/收入分类饼图
- ✅ 储蓄率计算
- ✅ 分类明细列表

### 预算
- ✅ 月度总预算
- ✅ 预算进度条
- ✅ 超支提醒

### 多账本
- ✅ 多账本管理（创建、切换、删除）
- ✅ 每个账本独立分类和数据

### 数据
- ✅ 数据导出（CSV）
- ✅ 数据导入（CSV）
- ✅ 本地存储（IndexedDB）
- ✅ 云同步（GitHub Gist）

## 技术栈

- **框架**: Vue 3 + Vite 6
- **UI 组件库**: Vant 4
- **状态管理**: Pinia
- **本地存储**: IndexedDB (idb)
- **图表**: ECharts
- **路由**: Vue Router 4 (Hash 模式)
- **日期处理**: Day.js
- **桌面端**: Electron 30
- **部署**: GitHub Pages + GitHub Actions

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 构建桌面安装包
npm run electron:build
```

## 项目结构

```
├── src/
│   ├── assets/          # 静态资源和全局样式
│   ├── db/              # IndexedDB 数据库操作
│   ├── router/          # 路由配置
│   ├── stores/         # Pinia 状态管理
│   ├── utils/           # 工具函数（含云同步）
│   ├── views/           # 页面组件
│   │   ├── Home/       # 首页（账单列表）
│   │   ├── Record/     # 记账/编辑
│   │   ├── Stats/      # 统计图表
│   │   ├── Budget/     # 预算管理
│   │   ├── Account/    # 我的/账本管理
│   │   ├── Category/   # 分类管理
│   │   └── Import/     # 数据导入
│   ├── App.vue
│   └── main.js
├── electron/            # Electron 主进程和预加载
├── build/               # 应用图标
├── public/              # PWA 配置和静态文件
└── .github/workflows/   # GitHub Actions 部署
```

## 云同步配置

1. 打开 https://github.com/settings/tokens/new?scopes=gist 创建 Token（只需 gist 权限）
2. 在应用「我的 → 云同步」中粘贴 Token
3. 两端自动同步数据

## License

[MIT](./LICENSE)
