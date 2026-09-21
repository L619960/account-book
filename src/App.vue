<template>
  <div class="app-container">
    <router-view />
    <van-tabbar
      v-if="showTabbar"
      v-model="activeTab"
      :fixed="true"
      :border="false"
      safe-area-inset-bottom
      @change="handleTabChange"
      active-color="#4f6ef7"
      inactive-color="#9aa0b4"
      class="app-tabbar"
    >
      <van-tabbar-item icon="wap-home-o">记账</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o">统计</van-tabbar-item>
      <van-tabbar-item icon="balance-list-o">预算</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initDB } from '@/db/index.js'
import { useAccountStore } from '@/stores/index.js'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const activeTab = ref(0)
const showTabbar = computed(() => tabMap.some(item => item.path === route.path))

const tabMap = [
  { path: '/', index: 0 },
  { path: '/stats', index: 1 },
  { path: '/budget', index: 2 },
  { path: '/account', index: 3 },
]

onMounted(async () => {
  try {
    await initDB()
    await accountStore.loadAccounts()
    updateActiveTab()
  } catch (error) {
    console.error('初始化失败:', error)
    showToast({ message: '初始化失败，请刷新页面', type: 'danger' })
  }
})

function updateActiveTab() {
  const current = tabMap.find(item => route.path === item.path)
  if (current) {
    activeTab.value = current.index
  }
}

function handleTabChange(index) {
  const target = tabMap.find(item => item.index === index)
  if (target && target.path !== route.path) {
    router.push(target.path)
  }
}

watch(() => route.path, () => {
  updateActiveTab()
})
</script>

<style>
.app-tabbar {
  left: 0 !important;
  right: 0 !important;
  box-shadow: 0 -4px 24px rgba(30, 41, 82, 0.06);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>