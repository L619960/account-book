<template>
  <div class="page-container">
    <van-nav-bar title="预算管理" />
    <van-dropdown-menu class="mt-2"><van-dropdown-item v-model="currentAccount" :options="accountOptions" @change="onAccountChange" /></van-dropdown-menu>

    <!-- 总预算卡片（突出） -->
    <div class="card total-budget" :class="{ 'over-budget-card': isTotalOverBudget() }">
      <div class="total-header">
        <div>
          <div class="total-title">本月总预算</div>
          <div class="total-amount money">{{ totalBudget > 0 ? '¥' + Number(totalBudget).toFixed(2) : '未设置' }}</div>
        </div>
        <van-tag v-if="totalBudget > 0" :type="isTotalOverBudget() ? 'danger' : 'primary'" size="medium" round>{{ getTotalBudgetPercent() }}%</van-tag>
      </div>
      <div v-if="totalBudget > 0" class="total-progress-wrap">
        <van-progress :percentage="getTotalBudgetPercent()" :stroke-width="10" :show-pivot="false" :color="isTotalOverBudget() ? '#f43f5e' : '#4f6ef7'" track-color="#eef1f7" />
      </div>
      <div v-if="totalBudget > 0" class="total-info">
        <span>已用 <b class="money">¥{{ (totalExpense || 0).toFixed(2) }}</b></span>
        <span :class="isTotalOverBudget() ? 'over-budget' : 'remain'">{{ isTotalOverBudget() ? '超支' : '剩余' }} <b class="money">¥{{ Math.abs(totalBudget - (totalExpense || 0)).toFixed(2) }}</b></span>
      </div>
      <van-button type="primary" size="small" round class="total-set-btn" @click="setTotalBudget">{{ totalBudget > 0 ? '修改总预算' : '设置总预算' }}</van-button>
    </div>

    <!-- 分类预算标题 -->
    <div class="section-head">
      <span>分类预算</span>
      <van-button type="primary" size="mini" round icon="plus" @click="openBudgetDialog()">添加</van-button>
    </div>

    <!-- 预算列表 -->
    <div v-for="budget in budgets" :key="budget.id" class="card budget-card">
      <div class="budget-header">
        <span class="budget-category">{{ getCategoryName(budget.categoryId) }}</span>
        <span class="budget-amount money">¥{{ budget.amount }}<i>/月</i></span>
      </div>
      <van-progress :percentage="getBudgetPercent(budget)" :stroke-width="8" :show-pivot="false" :color="getBudgetPercent(budget) >= 100 ? '#f43f5e' : '#4f6ef7'" track-color="#eef1f7" />
      <div class="budget-info">
        <span>已用 <b>¥{{ getBudgetUsed(budget) }}</b></span>
        <span :class="isOverBudget(budget) ? 'over-budget' : 'remain'">{{ isOverBudget(budget) ? '已超支' : '剩余' }} <b>¥{{ getBudgetRemaining(budget) }}</b></span>
      </div>
      <div class="budget-actions">
        <van-button size="mini" plain type="primary" @click="editBudget(budget)">编辑</van-button>
        <van-button size="mini" plain type="danger" @click="deleteBudget(budget.id)">删除</van-button>
      </div>
    </div>

    <!-- 总预算设置弹窗 -->
    <van-popup v-model:show="showTotalBudgetDialog" position="bottom" round :style="{ height: '30%' }">
      <div class="budget-form">
        <van-nav-bar title="设置总预算" @click-left="showTotalBudgetDialog = false" left-text="取消" />
        <van-field v-model="totalBudgetAmount" label="金额" type="number" placeholder="请输入月度总支出预算" />
        <div style="padding: 16px">
          <van-button round block type="primary" @click="saveTotalBudget">保存</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showBudgetDialog" position="bottom" round :style="{ height: '70%' }">
      <div class="budget-form">
        <van-nav-bar title="设置预算" @click-left="showBudgetDialog = false" left-text="取消" />
        <van-form @submit="saveBudget">
          <van-cell-group inset>
            <van-field v-model="selectedCategoryName" label="分类" readonly clickable right-icon="arrow" @click="showCategoryPicker = true" required />
            <van-field v-model="budgetAmount" label="金额" type="number" placeholder="请输入预算金额" required />
          </van-cell-group>
          <div style="padding: 16px">
            <van-button round block type="primary" native-type="submit">保存预算</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round :style="{ height: '50%' }">
      <van-picker
        :columns="categoryColumns"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBudgetStore } from '@/stores/index.js'
import { showDialog, showToast } from 'vant'
import dayjs from 'dayjs'
import { useAccountSwitch } from '@/utils/useAccountSwitch'

const budgetStore = useBudgetStore()

const { currentAccount, accountOptions, switchAccount, loadData, recordStore, categoryStore } = useAccountSwitch()
const budgets = ref([])
const showBudgetDialog = ref(false)
const showCategoryPicker = ref(false)
const selectedCategory = ref(null)
const selectedCategoryName = ref('')
const budgetAmount = ref('')
const editingBudgetId = ref(null)

const categoryColumns = computed(() => categoryStore.categories.filter(c => c.type === 'expense').map(c => ({ text: c.icon + c.name, value: c.name })))

const totalExpense = ref(0)

async function calcTotalExpense() {
  const now = dayjs().format('YYYY-MM-DD')
  const monthStart = dayjs().format('YYYY-MM-01')
  const accountId = currentAccount.value
  if (!accountId) return

  totalExpense.value = recordStore.records
    .filter(r => r.accountId === accountId && r.type === 'expense' && r.date >= monthStart && r.date <= now)
    .reduce((sum, r) => sum + Number(r.amount), 0)
}

const totalBudget = ref(Number(localStorage.getItem('totalBudget')) || 0)
const showTotalBudgetDialog = ref(false)
const totalBudgetAmount = ref(totalBudget.value ? totalBudget.value.toString() : '')

function getTotalBudgetPercent() {
  if (!totalBudget.value || totalBudget.value <= 0) return 0
  const expense = totalExpense.value || 0
  const percent = Math.round(expense / totalBudget.value * 100)
  return Math.min(Math.max(percent, 0), 100)
}

function isTotalOverBudget() {
  const expense = totalExpense.value || 0
  return totalBudget.value > 0 && expense > totalBudget.value
}

function setTotalBudget() {
  totalBudgetAmount.value = totalBudget.value ? totalBudget.value.toString() : ''
  showTotalBudgetDialog.value = true
}

async function saveTotalBudget() {
  if (!totalBudgetAmount.value || Number(totalBudgetAmount.value) <= 0) {
    showToast({ message: '请输入有效金额', type: 'warning' })
    return
  }
  totalBudget.value = Number(totalBudgetAmount.value)
  localStorage.setItem('totalBudget', totalBudget.value.toString())
  showTotalBudgetDialog.value = false
  showToast({ message: '总预算设置成功', type: 'success' })
}

function getCategoryName(catId) {
  const cat = categoryStore.categories.find(c => c.name === catId)
  return cat ? cat.name : catId
}

function getBudgetPercent(budget) {
  const used = getBudgetUsed(budget)
  if (!budget.amount || budget.amount <= 0) {
    return used > 0 ? 100 : 0
  }
  const percent = Math.round(used / budget.amount * 100)
  return Math.min(Math.max(percent, 0), 100)
}

function getBudgetUsed(budget) {
  const now = dayjs().format('YYYY-MM-DD')
  const monthStart = dayjs().format('YYYY-MM-01')
  return recordStore.records.filter(r => r.accountId === currentAccount.value && r.type === 'expense' && r.category === budget.categoryId && r.date >= monthStart && r.date <= now)
    .reduce((sum, r) => sum + Number(r.amount), 0)
}

function getBudgetRemaining(budget) {
  return Math.abs(budget.amount - getBudgetUsed(budget)).toFixed(2)
}

function isOverBudget(budget) {
  return getBudgetUsed(budget) > budget.amount
}

function openBudgetDialog(budget = null) {
  if (budget) {
    editingBudgetId.value = budget.id
    selectedCategory.value = budget.categoryId
    selectedCategoryName.value = getCategoryName(budget.categoryId)
    budgetAmount.value = budget.amount.toString()
  } else {
    editingBudgetId.value = null
    selectedCategory.value = null
    selectedCategoryName.value = ''
    budgetAmount.value = ''
  }
  showBudgetDialog.value = true
}

function editBudget(budget) {
  openBudgetDialog(budget)
}

async function deleteBudget(id) {
  showDialog({
    title: '确认删除',
    message: '确定要删除这个预算吗？'
  }).then(async () => {
    try {
      await budgetStore.deleteBudgetItem(id)
      showToast({ message: '删除成功', type: 'success' })
      await loadData()
    } catch (error) {
      console.error('删除预算失败:', error)
      showToast({ message: '删除失败', type: 'danger' })
    }
  }).catch(() => {})
}

function onCategoryConfirm({ selectedOptions }) {
  if (selectedOptions?.[0]) {
    selectedCategory.value = selectedOptions[0].value
    selectedCategoryName.value = selectedOptions[0].text
    showCategoryPicker.value = false
  }
}

async function saveBudget() {
  if (!selectedCategory.value) {
    showToast({ message: '请选择分类', type: 'warning' })
    return
  }
  if (!budgetAmount.value || Number(budgetAmount.value) <= 0) {
    showToast({ message: '请输入有效金额', type: 'warning' })
    return
  }

  try {
    const month = dayjs().format('YYYY-MM')
    const payload = {
      accountId: currentAccount.value,
      categoryId: selectedCategory.value,
      amount: Number(budgetAmount.value),
      month
    }
    const existing = budgetStore.budgets.find(b =>
      b.accountId === currentAccount.value &&
      b.categoryId === selectedCategory.value &&
      b.month === month
    )
    if (existing) {
      await budgetStore.updateBudgetItem(existing.id, payload)
      if (editingBudgetId.value && editingBudgetId.value !== existing.id) {
        await budgetStore.deleteBudgetItem(editingBudgetId.value)
      }
    } else if (editingBudgetId.value) {
      await budgetStore.updateBudgetItem(editingBudgetId.value, payload)
    } else {
      await budgetStore.addBudgetItem(payload)
    }
    showToast({ message: '预算设置成功', type: 'success' })
    showBudgetDialog.value = false
    editingBudgetId.value = null
    selectedCategory.value = null
    selectedCategoryName.value = ''
    budgetAmount.value = ''
    await loadData()
  } catch (error) {
    console.error('保存预算失败:', error)
    showToast({ message: '保存失败，请重试', type: 'danger' })
  }
}

function onAccountChange(val) {
  switchAccount(Number(val))
  loadBudgetData()
}

async function loadBudgetData() {
  try {
    await loadData({
      loadCategories: true,
      loadBudgets: true,
      loadRecords: true,
      categoryType: 'expense',
      recordOptions: { type: 'expense' }
    })

    const currentMonth = dayjs().format('YYYY-MM')
    budgets.value = budgetStore.budgets
      .filter(b => b.month === currentMonth)
      .sort((a, b) => b.createdAt - a.createdAt)

    await calcTotalExpense()
  } catch (error) {
    console.error('加载预算失败:', error)
    showToast({ message: '加载失败，请重试', type: 'danger' })
  }
}

onMounted(() => { loadBudgetData() })
</script>

<style scoped>
/* 总预算卡片 */
.total-budget {
  background: var(--brand-gradient);
  color: #fff;
  border: none;
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
}
.total-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.total-title {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 4px;
}
.total-amount {
  font-size: 26px;
  font-weight: 700;
}
.total-progress-wrap {
  margin: 10px 0;
}
.total-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  opacity: 0.95;
  margin-bottom: 14px;
}
.total-info b {
  font-weight: 600;
}
.total-set-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border: none !important;
  color: #fff !important;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 18px 4px 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
}

/* 分类预算卡片 */
.budget-card {
  padding: 16px;
}
.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.budget-category {
  font-weight: 600;
  font-size: 15px;
}
.budget-amount {
  color: var(--brand-600);
  font-weight: 700;
  font-size: 15px;
}
.budget-amount i {
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}
.budget-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 8px;
}
.budget-info b {
  color: var(--text-1);
}
.over-budget {
  color: var(--expense);
}
.over-budget b {
  color: var(--expense);
}
.remain b {
  color: var(--income);
}
.budget-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.over-budget-card {
  background: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%) !important;
  box-shadow: 0 10px 30px rgba(244, 63, 94, 0.3) !important;
}

.budget-form {
  background: #fff;
}
</style>
