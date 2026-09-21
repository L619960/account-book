import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home/HomeView.vue')
  },
  {
    path: '/record',
    name: 'Record',
    component: () => import('@/views/Record/RecordView.vue')
  },
  {
    path: '/record/add',
    name: 'AddRecord',
    component: () => import('@/views/Record/AddRecord.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/views/Stats/StatsView.vue')
  },
  {
    path: '/budget',
    name: 'Budget',
    component: () => import('@/views/Budget/BudgetView.vue')
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('@/views/Account/AccountView.vue')
  },
  {
    path: '/category',
    name: 'Category',
    component: () => import('@/views/Category/CategoryView.vue')
  },
  {
    path: '/import',
    name: 'ImportData',
    component: () => import('@/views/Import/ImportView.vue')
  }
]

const router = createRouter({
  // Electron 通过 loadFile 以 file:// 协议加载页面，必须使用 hash 模式，
  // 否则 history 路由在 file:// 下无法正常工作（导航/刷新即白屏）
  history: createWebHashHistory(),
  routes
})

export default router