<template>
  <div class="page-container record-page">
    <van-nav-bar :title="isEdit ? '编辑账单' : '记一笔'" left-arrow @click-left="goBack" />

    <!-- 类型切换：语义色分段控件 -->
    <div class="type-switch">
      <div class="type-btn expense" :class="{ active: form.type === 'expense' }" @click="form.type = 'expense'; onTypeChange()">
        支出
      </div>
      <div class="type-btn income" :class="{ active: form.type === 'income' }" @click="form.type = 'income'; onTypeChange()">
        收入
      </div>
    </div>

    <!-- 金额输入 -->
    <div class="card amount-card">
      <div class="amount-label">金额（元）</div>
      <div class="amount-input-wrap">
        <span class="currency">¥</span>
        <input
          v-model="form.amount"
          type="text"
          inputmode="decimal"
          placeholder="0.00"
          class="amount-native-input"
          @input="onAmountInput"
        />
      </div>
    </div>

    <!-- 分类选择 -->
    <div class="card">
      <div class="section-title">选择分类</div>
      <div class="category-grid">
        <div v-for="cat in currentCategories" :key="cat.name" class="category-item" :class="{ active: form.category === cat.name }" @click="form.category = cat.name">
          <div class="category-icon" :style="{ background: getCategoryBg(cat.name) }">{{ cat.icon }}</div>
          <div class="category-name">{{ cat.name }}</div>
        </div>
      </div>
    </div>

    <!-- 日期选择 -->
    <div class="card">
      <van-field v-model="form.date" label="日期" readonly clickable right-icon="arrow" />
    </div>
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="dateValue"
        title="选择日期"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 备注 -->
    <div class="card">
      <van-field v-model="form.note" label="备注" placeholder="添加备注（可选）" type="textarea" rows="2" />
    </div>

    <!-- 提交按钮 -->
    <div class="submit-section">
      <van-button type="primary" size="large" block round class="submit-btn" @click="submitRecord">保存</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCategoryStore, useAccountStore, useRecordStore } from '@/stores/index.js'
import { showToast } from 'vant'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const recordStore = useRecordStore()
const isEdit = ref(false)
const editId = ref(null)

function toDateParts(dateStr) {
  const d = dayjs(dateStr)
  return [d.format('YYYY'), d.format('MM'), d.format('DD')]
}

const form = ref({ type: 'expense', amount: '', category: '', date: dayjs().format('YYYY-MM-DD'), note: '', accountId: null })
const dateValue = ref(toDateParts(form.value.date))
const showDatePicker = ref(false)

const categoryColorMap = {
  '餐饮': '#fff1e6', '交通': '#e6f4ff', '购物': '#fce7f3', '娱乐': '#ede9fe',
  '住房': '#dcfce7', '医疗': '#fee2e2', '教育': '#e0e7ff', '通讯': '#cffafe',
  '服饰': '#fef3c7', '其他': '#f1f5f9', '工资': '#dcfce7', '奖金': '#fef9c3',
  '兼职': '#e0e7ff', '投资': '#ede9fe', '红包': '#fee2e2', '退款': '#dcfce7'
}
function getCategoryBg(name) {
  return categoryColorMap[name] || '#f1f5f9'
}

function onAmountInput(event) {
  let value = event.target.value
  value = value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  if (parts[1] && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].slice(0, 2)
  }
  if (parts[0].length > 10) {
    value = parts[0].slice(0, 10) + (parts[1] ? '.' + parts[1] : '')
  }
  form.value.amount = value
}

const currentCategories = computed(() => {
  return categoryStore.categories.filter(c => c.type === form.value.type)
})

async function loadData() {
  try {
    if (!accountStore.accounts.length) {
      await accountStore.loadAccounts()
    }
    if (route.query.editId) {
      isEdit.value = true
      editId.value = parseInt(route.query.editId)
      const accountId = parseInt(route.query.accountId) || accountStore.currentAccountId
      const record = await recordStore.getRecords(accountId, {})
        .then(recs => recs.find(r => r.id === editId.value))
      if (record) {
        form.value = {
          type: record.type,
          amount: record.amount.toString(),
          category: record.category,
          date: record.date,
          note: record.note || '',
          accountId: record.accountId
        }
        dateValue.value = toDateParts(record.date)
      }
    }

    form.value.accountId = parseInt(route.query.accountId) || accountStore.currentAccountId
    await categoryStore.loadCategories(form.value.accountId, form.value.type)
    if (!form.value.category && currentCategories.value.length > 0) {
      form.value.category = currentCategories.value[0].name
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    showToast({ message: '加载失败，请重试', type: 'danger' })
  }
}

async function onTypeChange() {
  await categoryStore.loadCategories(form.value.accountId, form.value.type)
  const matched = currentCategories.value.some(c => c.name === form.value.category)
  if (!matched) {
    form.value.category = currentCategories.value[0]?.name || ''
  }
}

function onDateConfirm({ selectedValues }) {
  const values = selectedValues?.length ? selectedValues : dateValue.value
  form.value.date = values.join('-')
  dateValue.value = values
  showDatePicker.value = false
}

async function submitRecord() {
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    showToast({ message: '请输入金额', type: 'warning' })
    return
  }
  if (!form.value.category) {
    showToast({ message: '请选择分类', type: 'warning' })
    return
  }
  if (!form.value.accountId) {
    showToast({ message: '请先选择账本', type: 'warning' })
    return
  }

  try {
    const recordData = {
      accountId: form.value.accountId,
      type: form.value.type,
      amount: Number(form.value.amount),
      category: form.value.category,
      date: form.value.date,
      note: form.value.note
    }

    if (isEdit.value && editId.value) {
      await recordStore.updateRecordItem(editId.value, recordData)
      showToast({ message: '更新成功', type: 'success' })
    } else {
      await recordStore.addRecordItem(recordData)
      showToast({ message: '记录成功', type: 'success' })
    }

    setTimeout(() => router.push('/'), 800)
  } catch (error) {
    console.error('保存失败:', error)
    showToast({ message: '保存失败，请重试', type: 'danger' })
  }
}

function goBack() {
  router.push('/')
}

onMounted(() => { loadData() })
</script>

<style scoped>
.record-page {
  padding-top: 0;
}

/* 类型分段控件 */
.type-switch {
  display: flex;
  background: #fff;
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
  gap: 4px;
}
.type-btn {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  color: var(--text-3);
  transition: all 0.25s;
}
.type-btn.expense.active {
  background: var(--expense);
  color: #fff;
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
}
.type-btn.income.active {
  background: var(--income);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 金额卡片 */
.amount-card {
  text-align: center;
  padding: 26px 18px;
  margin-bottom: 16px;
}
.amount-label {
  font-size: 13px;
  color: var(--text-3);
  margin-bottom: 8px;
}
.amount-input-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}
.currency {
  font-size: 28px;
  color: var(--text-2);
  font-weight: 500;
}
.amount-native-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 44px;
  font-weight: 700;
  color: var(--text-1);
  background: transparent;
  text-align: center;
  width: 100%;
  font-variant-numeric: tabular-nums;
}
.amount-native-input::placeholder {
  color: #d4d7e0;
  font-weight: 600;
}

/* 分类 */
.section-title {
  font-size: 14px;
  color: var(--text-2);
  font-weight: 600;
  margin-bottom: 14px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 8px;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.category-item.active {
  background: var(--brand-50);
}
.category-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 6px;
  transition: transform 0.2s;
}
.category-item.active .category-icon {
  transform: scale(1.08);
  box-shadow: 0 4px 10px rgba(79, 110, 247, 0.18);
}
.category-name {
  font-size: 12px;
  color: var(--text-2);
}
.category-item.active .category-name {
  color: var(--brand-600);
  font-weight: 600;
}

.submit-section {
  padding: 20px 0;
  padding-bottom: 96px;
}
.submit-btn {
  background: var(--brand-gradient) !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
  border-radius: 14px !important;
}
</style>
