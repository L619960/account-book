<template>
  <div class="page-container">
    <van-nav-bar title="全部记录" left-arrow @click-left="goBack" />
    <div class="record-list">
      <div v-for="record in records" :key="record.id" class="record-item" @click="viewDetail(record)">
        <div class="record-icon" :style="{ background: getCategoryBg(record.category) }">
          {{ getCategoryIcon(record.category) }}
        </div>
        <div class="record-info">
          <div class="record-category">{{ record.category }}</div>
          <div class="record-date">{{ record.date }}</div>
        </div>
        <div class="record-amount money" :class="record.type === 'income' ? 'amount-income' : 'amount-expense'">
          {{ record.type === 'income' ? '+' : '-' }}¥{{ Number(record.amount).toFixed(2) }}
        </div>
      </div>
    </div>
    <van-empty v-if="records.length === 0" description="暂无记录" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRecordStore, useAccountStore } from '@/stores/index.js'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const recordStore = useRecordStore()
const accountStore = useAccountStore()

const records = ref([])

const categoryColorMap = {
  '餐饮': '#fff1e6', '交通': '#e6f4ff', '购物': '#fce7f3', '娱乐': '#ede9fe',
  '住房': '#dcfce7', '医疗': '#fee2e2', '教育': '#e0e7ff', '通讯': '#cffafe',
  '服饰': '#fef3c7', '其他': '#f1f5f9', '工资': '#dcfce7', '奖金': '#fef9c3',
  '兼职': '#e0e7ff', '投资': '#ede9fe', '红包': '#fee2e2', '退款': '#dcfce7'
}
function getCategoryBg(category) {
  return categoryColorMap[category] || '#f1f5f9'
}

const getCategoryIcon = (category) => {
  const icons = {
    '餐饮': '🍜', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮',
    '住房': '🏠', '医疗': '💊', '教育': '📚', '通讯': '📱',
    '服饰': '👕', '其他': '📦', '工资': '💰', '奖金': '🎁',
    '兼职': '💼', '投资': '📈', '红包': '🧧', '退款': '💸'
  }
  return icons[category] || '📦'
}

function viewDetail(record) {
  router.push({ path: '/record/add', query: { editId: record.id } })
}

function goBack() {
  router.back()
}

async function loadData() {
  try {
    const accountId = accountStore.currentAccountId || route.query.accountId
    if (accountId) {
      records.value = await recordStore.getRecords(parseInt(accountId), {})
    }
  } catch (error) {
    console.error('加载记录失败:', error)
    showToast({ message: '加载失败', type: 'danger' })
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.record-list {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.record-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
}
.record-item + .record-item {
  border-top: 1px solid var(--border);
}
.record-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-right: 12px;
  flex-shrink: 0;
}
.record-info {
  flex: 1;
}
.record-category {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
}
.record-date {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
}
.record-amount {
  font-size: 17px;
  font-weight: 700;
}
</style>
