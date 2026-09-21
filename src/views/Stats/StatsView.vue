<template>
  <div class="page-container">
    <van-nav-bar title="统计分析" />
    <van-dropdown-menu class="mt-2"><van-dropdown-item v-model="currentAccount" :options="accountOptions" @change="onAccountChange" /></van-dropdown-menu>
    <div class="month-bar" @click="showMonthPicker = true">
      <span>{{ monthLabel }}</span>
      <van-icon name="arrow-down" />
    </div>
    <div class="card"><div class="card-title">本月收支</div>
      <div class="summary-row">
        <div class="summary-item"><div class="label">收入</div><div class="value amount-income money">{{ formatMoney(monthIncome) }}</div></div>
        <div class="summary-divider"></div>
        <div class="summary-item"><div class="label">支出</div><div class="value amount-expense money">{{ formatMoney(monthExpense) }}</div></div>
        <div class="summary-divider"></div>
        <div class="summary-item"><div class="label">储蓄率</div><div class="value money">{{ savingsRate }}%</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">每日趋势</div>
      <div class="chart-container" style="height: 250px"><v-chart :option="trendChartOption" autoresize /></div>
    </div>
    <div class="card">
      <div class="card-title">支出分类</div>
      <div class="chart-container"><v-chart :option="expenseChartOption" autoresize /></div>
      <div class="category-list">
        <div v-for="item in expenseCategoryList" :key="item.name" class="category-item-row">
          <div class="category-info"><span class="category-icon" :style="{ background: getCategoryBg(item.name) }">{{ getCategoryIcon(item.name) }}</span><span>{{ item.name }}</span></div>
          <div class="category-right"><span class="amount amount-expense money">{{ formatMoney(item.amount) }}</span><span class="percent">{{ item.percent }}%</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">收入分类</div>
      <div class="chart-container"><v-chart :option="incomeChartOption" autoresize /></div>
      <div class="category-list">
        <div v-for="item in incomeCategoryList" :key="item.name" class="category-item-row">
          <div class="category-info"><span class="category-icon" :style="{ background: getCategoryBg(item.name) }">{{ getCategoryIcon(item.name) }}</span><span>{{ item.name }}</span></div>
          <div class="category-right"><span class="amount amount-income money">{{ formatMoney(item.amount) }}</span><span class="percent">{{ item.percent }}%</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRecordStore } from '@/stores/index.js'
import { formatMoney, getMonthRange, getCategoryIcon, calculateTotal } from '@/utils/index.js'
import { showToast } from 'vant'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, LineChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import dayjs from 'dayjs'
import { useAccountSwitch } from '@/utils/useAccountSwitch'

use([CanvasRenderer, PieChart, LineChart, TooltipComponent, LegendComponent, GridComponent])

const recordStore = useRecordStore()
const now = dayjs()
const monthPickerValue = ref([now.format('YYYY'), now.format('MM')])
const showMonthPicker = ref(false)

const { currentAccount, accountOptions, switchAccount, loadData } = useAccountSwitch()

// 分类图标柔和底色
const categoryColorMap = {
  '餐饮': '#fff1e6', '交通': '#e6f4ff', '购物': '#fce7f3', '娱乐': '#ede9fe',
  '住房': '#dcfce7', '医疗': '#fee2e2', '教育': '#e0e7ff', '通讯': '#cffafe',
  '服饰': '#fef3c7', '其他': '#f1f5f9', '工资': '#dcfce7', '奖金': '#fef9c3',
  '兼职': '#e0e7ff', '投资': '#ede9fe', '红包': '#fee2e2', '退款': '#dcfce7'
}
function getCategoryBg(name) {
  return categoryColorMap[name] || '#f1f5f9'
}

// 饼图配色（与主色协调）
const piePalette = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#64748b']

const selectedMonth = computed(() => monthPickerValue.value.join('-'))
const monthLabel = computed(() => `${monthPickerValue.value[0]}年${monthPickerValue.value[1]}月`)
const monthRange = computed(() => getMonthRange(selectedMonth.value))
const records = computed(() => recordStore.records.filter(r => r.date >= monthRange.value.startDate && r.date <= monthRange.value.endDate))
const monthIncome = computed(() => calculateTotal(records.value, 'income'))
const monthExpense = computed(() => calculateTotal(records.value, 'expense'))
const savingsRate = computed(() => monthIncome.value > 0 ? Math.round((monthIncome.value - monthExpense.value) / monthIncome.value * 100) : 0)
const expenseCategoryList = computed(() => getCategoryStats('expense'))
const incomeCategoryList = computed(() => getCategoryStats('income'))

const expenseChartOption = computed(() => ({
  color: piePalette,
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['45%', '70%'], data: expenseCategoryList.value.slice(0, 8).map(i => ({ name: i.name, value: i.amount })), label: { show: false }, itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 } }]
}))
const incomeChartOption = computed(() => ({
  color: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#10b981', '#84cc16', '#0d9488'],
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['45%', '70%'], data: incomeCategoryList.value.slice(0, 8).map(i => ({ name: i.name, value: i.amount })), label: { show: false }, itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 } }]
}))

// 每日收支趋势
const dailyTrend = computed(() => {
  if (!records.value.length) return { dates: [], income: [], expense: [] }

  const { startDate } = monthRange.value
  const startDateObj = dayjs(startDate)
  const daysInMonth = startDateObj.daysInMonth()
  const dateMap = {}

  for (let i = 1; i <= daysInMonth; i++) {
    const date = startDateObj.add(i - 1, 'day').format('MM-DD')
    dateMap[date] = { income: 0, expense: 0 }
  }

  records.value.forEach(r => {
    const date = dayjs(r.date).format('MM-DD')
    if (dateMap[date]) {
      if (r.type === 'income') dateMap[date].income += Number(r.amount)
      else dateMap[date].expense += Number(r.amount)
    }
  })

  const dates = Object.keys(dateMap)
  const income = dates.map(d => dateMap[d].income)
  const expense = dates.map(d => dateMap[d].expense)

  return { dates, income, expense }
})

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['收入', '支出'], bottom: 0, icon: 'circle' },
  grid: { top: 30, bottom: 40, left: 50, right: 20 },
  xAxis: {
    type: 'category',
    data: dailyTrend.value.dates,
    axisLabel: { show: dailyTrend.value.dates.length <= 15 ? true : false, color: '#9aa0b4', fontSize: 11 },
    axisLine: { lineStyle: { color: '#eef1f7' } }
  },
  yAxis: { type: 'value', axisLabel: { color: '#9aa0b4', fontSize: 11 }, splitLine: { lineStyle: { color: '#f0f2f7' } } },
  series: [
    {
      name: '收入',
      type: 'line',
      data: dailyTrend.value.income,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#10b981', width: 2.5 },
      areaStyle: { color: 'rgba(16, 185, 129, 0.12)' }
    },
    {
      name: '支出',
      type: 'line',
      data: dailyTrend.value.expense,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#f43f5e', width: 2.5 },
      areaStyle: { color: 'rgba(244, 63, 94, 0.10)' }
    }
  ]
}))

function getCategoryStats(type) {
  const recs = records.value.filter(r => r.type === type)
  const total = type === 'expense' ? monthExpense.value : monthIncome.value
  if (total === 0) return []
  const map = {}
  recs.forEach(r => { map[r.category] = (map[r.category] || 0) + Number(r.amount) })
  return Object.entries(map).map(([name, amount]) => ({ name, amount, percent: Math.round(amount / total * 100) })).sort((a, b) => b.amount - a.amount)
}

function onAccountChange(val) {
  switchAccount(Number(val))
  loadStatsData()
}

function onMonthConfirm() {
  showMonthPicker.value = false
  loadStatsData()
}

async function loadStatsData() {
  try {
    await loadData({
      loadRecords: true,
      recordOptions: {
        startDate: monthRange.value.startDate,
        endDate: monthRange.value.endDate
      }
    })
  } catch (error) {
    console.error('加载统计数据失败:', error)
    showToast({ message: '加载失败', type: 'danger' })
  }
}

onMounted(() => { loadStatsData() })
</script>

<style scoped>
.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin: 12px 0;
  font-weight: 600;
  box-shadow: var(--shadow-card);
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--text-1);
}
.summary-row {
  display: flex;
  align-items: center;
  text-align: center;
}
.summary-item {
  flex: 1;
}
.summary-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}
.summary-item .label {
  font-size: 13px;
  color: var(--text-3);
  margin-bottom: 6px;
}
.summary-item .value {
  font-size: 18px;
  font-weight: 700;
}
.category-list {
  margin-top: 8px;
}
.category-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
}
.category-item-row + .category-item-row {
  border-top: 1px solid var(--border);
}
.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-1);
}
.category-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.category-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.category-right .amount {
  font-size: 14px;
  font-weight: 600;
}
.percent {
  font-size: 12px;
  color: var(--text-3);
  width: 38px;
  text-align: right;
}
</style>
