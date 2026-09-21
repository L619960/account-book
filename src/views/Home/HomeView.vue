<template>
  <div class="page-container home-page">
    <van-dropdown-menu class="account-dropdown">
      <van-dropdown-item v-model="currentAccount" :options="accountOptions" @change="onAccountChange" />
    </van-dropdown-menu>

    <!-- 渐变 Hero 概览卡片 -->
    <div class="hero" @click="showMonthPicker = true">
      <div class="hero-top">
        <span class="hero-month">{{ monthLabel }}</span>
        <van-icon name="arrow-down" class="hero-arrow" />
      </div>
      <div class="hero-balance">
        <span class="hero-label">本月结余（元）</span>
        <div class="hero-amount money">
          {{ formatMoney(monthIncome - monthExpense) }}
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <span class="hero-stat-label">收入</span>
          <span class="hero-stat-value money">{{ formatMoney(monthIncome) }}</span>
        </div>
        <div class="hero-divider"></div>
        <div class="hero-stat">
          <span class="hero-stat-label">支出</span>
          <span class="hero-stat-value money">{{ formatMoney(monthExpense) }}</span>
        </div>
      </div>
    </div>

    <van-popup v-model:show="showMonthPicker" position="bottom" round>
      <van-date-picker
        v-model="monthPickerValue"
        title="选择月份"
        :columns-type="['year', 'month']"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>

    <!-- 类型筛选 -->
    <div class="filter-bar">
      <van-radio-group v-model="filterType" direction="horizontal" @change="loadData">
        <van-radio name="all">全部</van-radio>
        <van-radio name="expense">支出</van-radio>
        <van-radio name="income">收入</van-radio>
      </van-radio-group>
    </div>

    <van-loading v-if="loading && displayRecords.length === 0" size="24px" class="loading-wrap">加载中...</van-loading>
    <van-list v-else v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
      <div v-if="displayRecords.length === 0 && !loading" class="empty-wrap">
        <van-empty description="暂无账单记录" />
        <van-button type="primary" size="small" round @click="goToAdd">记一笔</van-button>
      </div>

      <div class="record-list">
        <div v-for="record in displayRecords" :key="record.id" class="record-item" @click="showDetail(record)">
          <div class="record-icon" :style="{ background: getCategoryBg(record.category) }">
            {{ getCategoryIcon(record.category) }}
          </div>
          <div class="record-info">
            <div class="record-category">{{ record.category }}</div>
            <div class="record-date">
              {{ formatRecordDate(record.date) }}<span v-if="record.note" class="record-note"> · {{ record.note }}</span>
            </div>
          </div>
          <div class="record-amount money" :class="record.type === 'income' ? 'amount-income' : 'amount-expense'">
            {{ record.type === 'income' ? '+' : '-' }}{{ formatMoney(record.amount) }}
          </div>
        </div>
      </div>
    </van-list>

    <van-button class="add-btn" icon="plus" round @click="goToAdd" />

    <van-popup v-model:show="showDetailPopup" position="bottom" round :style="{ height: '40%' }">
      <div v-if="detailRecord" class="detail-content">
        <van-nav-bar title="账单详情" @click-left="showDetailPopup = false" left-text="关闭" />
        <div style="padding: 20px">
          <div class="detail-row"><span class="detail-label">类型</span><span class="detail-value">{{ detailRecord.type === 'income' ? '收入' : '支出' }}</span></div>
          <div class="detail-row"><span class="detail-label">金额</span><span class="detail-value money" :class="detailRecord.type === 'income' ? 'amount-income' : 'amount-expense'">{{ detailRecord.type === 'income' ? '+' : '-' }}{{ formatMoney(detailRecord.amount) }}</span></div>
          <div class="detail-row"><span class="detail-label">分类</span><span class="detail-value">{{ detailRecord.category }}</span></div>
          <div class="detail-row"><span class="detail-label">日期</span><span class="detail-value">{{ detailRecord.date }}</span></div>
          <div class="detail-row" v-if="detailRecord.note"><span class="detail-label">备注</span><span class="detail-value">{{ detailRecord.note }}</span></div>
        </div>
      </div>
    </van-popup>
    <van-dialog v-model:show="showDeleteDialog" title="确认删除" @confirm="handleDelete" show-cancel-button><p>确定要删除这条账单记录吗？</p></van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore, useRecordStore } from '@/stores/index.js'
import { formatMoney, getMonthRange, getCategoryIcon, calculateTotal } from '@/utils/index.js'
import { showToast } from 'vant'
import dayjs from 'dayjs'

const router = useRouter()
const accountStore = useAccountStore()
const recordStore = useRecordStore()
const now = dayjs()
const monthPickerValue = ref([now.format('YYYY'), now.format('MM')])
const showMonthPicker = ref(false)
const filterType = ref('all')
const loading = ref(false)
const finished = ref(false)
const showDetailPopup = ref(false)
const showDeleteDialog = ref(false)
const detailRecord = ref(null)
const currentAccount = ref(null)
const accountOptions = ref([])
const currentPage = ref(1)
const pageSize = 20

// 分类图标柔和底色
const categoryColorMap = {
  '餐饮': '#fff1e6', '交通': '#e6f4ff', '购物': '#fce7f3', '娱乐': '#ede9fe',
  '住房': '#dcfce7', '医疗': '#fee2e2', '教育': '#e0e7ff', '通讯': '#cffafe',
  '服饰': '#fef3c7', '其他': '#f1f5f9', '工资': '#dcfce7', '奖金': '#fef9c3',
  '兼职': '#e0e7ff', '投资': '#ede9fe', '红包': '#fee2e2', '退款': '#dcfce7'
}
function getCategoryBg(category) {
  return categoryColorMap[category] || '#f1f5f9'
}

const selectedMonth = computed(() => monthPickerValue.value.join('-'))
const monthLabel = computed(() => `${monthPickerValue.value[0]}年${monthPickerValue.value[1]}月`)
const monthRange = computed(() => getMonthRange(selectedMonth.value))
const monthIncome = computed(() => calculateTotal(filteredRecords.value, 'income'))
const monthExpense = computed(() => calculateTotal(filteredRecords.value, 'expense'))

const filteredRecords = computed(() => {
  let records = recordStore.records.filter(r => r.date >= monthRange.value.startDate && r.date <= monthRange.value.endDate)
  if (filterType.value !== 'all') records = records.filter(r => r.type === filterType.value)
  return records
})

const displayRecords = computed(() => filteredRecords.value.slice(0, currentPage.value * pageSize))

function formatRecordDate(date) {
  const d = dayjs(date), today = dayjs()
  if (d.isSame(today, 'day')) return '今天'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return '昨天'
  return d.format('MM-DD')
}

async function loadData() {
  loading.value = true
  finished.value = false
  currentPage.value = 1

  try {
    if (accountStore.accounts.length === 0) {
      await accountStore.loadAccounts()
    }

    if (accountStore.accounts.length > 0) {
      currentAccount.value = accountStore.currentAccountId || accountStore.accounts[0].id
      accountOptions.value = accountStore.accounts.map(a => ({ text: a.name, value: a.id }))
    }

    const accountId = currentAccount.value
    if (accountId && accountOptions.value.length > 0) {
      await recordStore.loadRecords(accountId, {
        startDate: monthRange.value.startDate,
        endDate: monthRange.value.endDate
      })
    }
  } catch (error) {
    console.error('加载数据失败:', error.stack || error)
    showToast({ message: '加载失败: ' + (error.message || error), type: 'danger' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (displayRecords.value.length >= filteredRecords.value.length) finished.value = true
  else currentPage.value += 1
  loading.value = false
}
function onAccountChange(val) {
  const id = Number(val)
  currentAccount.value = id
  accountStore.currentAccountId = id
  loadData()
}
function onMonthConfirm() {
  showMonthPicker.value = false
  loadData()
}
function goToAdd() { router.push({ path: '/record/add', query: { accountId: currentAccount.value } }) }
function showDetail(record) { detailRecord.value = record; showDetailPopup.value = true }
function confirmDelete(record) {
  detailRecord.value = record
  showDeleteDialog.value = true
}

async function handleDelete() {
  try {
    if (detailRecord.value) {
      await recordStore.deleteRecordItem(detailRecord.value.id)
      showToast({ message: '删除成功', type: 'success' })
      showDeleteDialog.value = false
      await loadData()
    }
  } catch (error) {
    console.error('删除失败:', error)
    showToast({ message: '删除失败', type: 'danger' })
  }
}

function editRecord(record) {
  router.push({ path: '/record/add', query: { editId: record.id, accountId: record.accountId } })
  showDetailPopup.value = false
}

onMounted(() => { loadData() })
</script>

<style scoped>
.account-dropdown {
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 14px;
}

/* Hero 卡片 */
.hero {
  background: var(--brand-gradient);
  border-radius: var(--radius-lg);
  padding: 22px 22px 20px;
  margin-bottom: 18px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.35);
  cursor: pointer;
}
.hero-top {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
  font-size: 14px;
}
.hero-arrow {
  font-size: 14px;
}
.hero-balance {
  margin: 14px 0 18px;
}
.hero-label {
  font-size: 13px;
  opacity: 0.85;
}
.hero-amount {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 4px;
  letter-spacing: -0.5px;
}
.hero-currency {
  font-size: 22px;
  font-weight: 500;
  margin-right: 4px;
  opacity: 0.9;
}
.hero-stats {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 12px 8px;
}
.hero-stat {
  flex: 1;
  text-align: center;
}
.hero-stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}
.hero-stat-value {
  font-size: 16px;
  font-weight: 600;
}
.hero-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.3);
}

/* 筛选 */
.filter-bar {
  display: flex;
  align-items: center;
  padding: 4px 4px 14px;
}

/* 账单列表 */
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
  transition: background 0.15s;
}
.record-item:active {
  background: #f7f8fc;
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
  min-width: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-note {
  color: var(--text-3);
}
.record-amount {
  font-size: 17px;
  font-weight: 700;
  margin-left: 8px;
}

/* 详情 */
.detail-content {
  background: #fff;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.detail-label {
  color: var(--text-3);
}
.detail-value {
  color: var(--text-1);
  font-weight: 500;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
</style>
