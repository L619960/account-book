# H5 记账本

一个基于 Vue 3 的移动端记账应用，支持收支记录、预算管理、数据统计等功能。

## 技术栈

- **框架**: Vue 3 + Vite
- **UI 组件库**: Vant 4
- **状态管理**: Pinia
- **本地存储**: IndexedDB (通过 idb 库)
- **图表**: ECharts + vue-echarts
- **路由**: Vue Router 4
- **日期处理**: Day.js
- **数据导出**: SheetJS (xlsx)

## 功能特性

### 基础功能
- ✅ 收支记录（添加、删除）
- ✅ 分类管理（自定义分类、emoji 图标）
- ✅ 账单列表（筛选、搜索）
- ✅ 月份切换

### 高级功能
- ✅ 多账本管理（创建、切换、删除）
- ✅ 预算管理（分类预算、预算提醒）
- ✅ 数据统计（饼图展示、收支分析）
- ✅ 数据导出（CSV 格式）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # 公共组件
├── db/              # IndexedDB 数据库操作
├── router/          # 路由配置
├── stores/          # Pinia 状态管理
├── utils/           # 工具函数
├── views/           # 页面组件
│   ├── Home/        # 首页（账单列表）
│   ├── Record/      # 记账页面
│   ├── Stats/       # 统计页面
│   ├── Budget/      # 预算页面
│   ├── Account/     # 账本管理
│   └── Category/    # 分类管理
├── App.vue          # 根组件
└── main.js          # 入口文件
```

## 页面说明

### 首页（记账）
- 账本选择器
- 月份切换
- 收支概览（收入、支出、结余）
- 账单列表（筛选、搜索）
- 悬浮按钮快速记账

### 记账页面
- 收支类型切换
- 金额输入（支持键盘输入）
- 分类选择（网格布局）
- 日期选择
- 备注输入

### 统计页面
- 收支对比
- 储蓄率计算
- 支出分类饼图
- 收入分类饼图
- 分类明细列表

### 预算页面
- 预算设置
- 预算进度条
- 已用金额/剩余金额
- 超支提醒

### 我的（账本管理）
- 多账本创建/切换/删除
- 数据导出
- 分类管理入口
- 数据清空

### 分类管理
- 支出分类管理
- 收入分类管理
- 添加自定义分类
- 删除分类

## 默认分类

### 支出分类
餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、服饰、其他

### 收入分类
工资、奖金、兼职、投资、红包、退款、其他

## 数据库设计

### Records（账单）
- id, accountId, type, amount, category, date, note, createdAt, updatedAt

### Accounts（账本）
- id, name, color, createdAt

### Categories（分类）
- id, name, icon, type, accountId, isDefault, sort, createdAt

### Budgets（预算）
- id, accountId, categoryId, month, amount, createdAt, updatedAt

## 开发计划

- [ ] 编辑账单记录
- [ ] 图表切换年/月视图
- [ ] 预算提醒功能
- [ ] 数据备份/恢复
- [ ] 主题切换
- [ ] 更多统计图表
- [ ] 导入数据功能

## License

MIT