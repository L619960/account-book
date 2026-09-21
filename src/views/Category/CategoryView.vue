<template>
  <div class="page-container">
    <van-nav-bar title="分类管理" left-arrow @click-left="router.back()" />

    <van-tabs v-model:active="activeTab" class="cat-tabs">
      <van-tab title="支出分类" name="expense">
        <div class="category-list">
          <div v-for="cat in expenseCategories" :key="cat.id" class="category-item">
            <span class="category-icon" :style="{ background: getCategoryBg(cat.name) }">{{ cat.icon }}</span>
            <span class="category-name">{{ cat.name }}</span>
            <van-icon name="cross" @click="deleteCategory(cat.id)" class="delete-btn" />
          </div>
          <div v-if="expenseCategories.length === 0" class="empty-tip">暂无支出分类</div>
        </div>
      </van-tab>
      <van-tab title="收入分类" name="income">
        <div class="category-list">
          <div v-for="cat in incomeCategories" :key="cat.id" class="category-item">
            <span class="category-icon" :style="{ background: getCategoryBg(cat.name) }">{{ cat.icon }}</span>
            <span class="category-name">{{ cat.name }}</span>
            <van-icon name="cross" @click="deleteCategory(cat.id)" class="delete-btn" />
          </div>
          <div v-if="incomeCategories.length === 0" class="empty-tip">暂无收入分类</div>
        </div>
      </van-tab>
    </van-tabs>

    <div class="footer-action">
      <van-button type="primary" block round icon="plus" @click="showAddDialog = true">添加分类</van-button>
    </div>
  </div>

  <!-- 添加分类弹窗 -->
  <van-popup v-model:show="showAddDialog" position="bottom" round :style="{ height: '60%' }">
    <div class="add-form">
      <van-nav-bar title="添加分类" @click-left="showAddDialog = false" left-text="取消" />
      <div class="add-body">
        <van-cell-group inset>
          <van-field v-model="newCatName" label="名称" placeholder="请输入分类名称" />
        </van-cell-group>
        <div class="icon-picker-label">选择图标</div>
        <div class="icon-picker">
          <span v-for="icon in suggestIcons" :key="icon" class="icon-item" :class="{ active: newCatIcon === icon }" @click="newCatIcon = icon">{{ icon }}</span>
        </div>
        <div class="add-submit">
          <van-button type="primary" block round @click="addCategory">确认添加</van-button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore, useAccountStore } from '@/stores/index.js'
import { showDialog, showToast } from 'vant'

const router = useRouter()
const categoryStore = useCategoryStore()
const accountStore = useAccountStore()

const activeTab = ref('expense')
const showAddDialog = ref(false)
const newCatName = ref('')
const newCatIcon = ref('📦')
const expenseCategories = ref([])
const incomeCategories = ref([])

const suggestIcons = ['🍜', '🚗', '🛍️', '🎮', '🏠', '💊', '📚', '📱', '👕', '💰', '🎁', '💼', '📈', '🧧', '💸', '📦']

const categoryColorMap = {
  '餐饮': '#fff1e6', '交通': '#e6f4ff', '购物': '#fce7f3', '娱乐': '#ede9fe',
  '住房': '#dcfce7', '医疗': '#fee2e2', '教育': '#e0e7ff', '通讯': '#cffafe',
  '服饰': '#fef3c7', '其他': '#f1f5f9', '工资': '#dcfce7', '奖金': '#fef9c3',
  '兼职': '#e0e7ff', '投资': '#ede9fe', '红包': '#fee2e2', '退款': '#dcfce7'
}
function getCategoryBg(name) {
  return categoryColorMap[name] || '#f1f5f9'
}

async function loadData() {
  if (!accountStore.accounts.length) {
    await accountStore.loadAccounts()
  }
  if (accountStore.currentAccountId) {
    expenseCategories.value = await categoryStore.getCategoriesList(accountStore.currentAccountId, 'expense') || []
    incomeCategories.value = await categoryStore.getCategoriesList(accountStore.currentAccountId, 'income') || []
  }
}

async function addCategory() {
  if (!newCatName.value) {
    showToast({ message: '请输入名称', type: 'warning' })
    return
  }
  try {
    await categoryStore.addCategoryItem({
      name: newCatName.value,
      icon: newCatIcon.value,
      type: activeTab.value,
      accountId: accountStore.currentAccountId
    })
    showAddDialog.value = false
    newCatName.value = ''
    newCatIcon.value = '📦'
    showToast({ message: '添加成功', type: 'success' })
    await loadData()
  } catch (error) {
    console.error('添加分类失败:', error)
    showToast({ message: '添加失败', type: 'danger' })
  }
}

async function deleteCategory(id) {
  showDialog({
    title: '确认删除',
    message: '确定要删除这个分类吗？'
  }).then(async () => {
    try {
      await categoryStore.deleteCategoryById(id)
      showToast({ message: '删除成功', type: 'success' })
      await loadData()
    } catch (error) {
      console.error('删除分类失败:', error)
      showToast({ message: '删除失败', type: 'danger' })
    }
  }).catch(() => {})
}

onMounted(() => { loadData() })
</script>

<style scoped>
.cat-tabs {
  background: #fff;
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
}
.category-list {
  padding: 8px 0;
}
.category-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: #fff;
  margin: 0 14px 8px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 12px;
}
.category-name {
  flex: 1;
  font-size: 15px;
  color: var(--text-1);
}
.delete-btn {
  color: #c8c9cc;
  font-size: 16px;
  padding: 6px;
}
.empty-tip {
  text-align: center;
  color: var(--text-3);
  padding: 40px 0;
  font-size: 14px;
}
.footer-action {
  padding: 16px 0;
  padding-bottom: 96px;
}
.add-form {
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.add-body {
  flex: 1;
  padding-top: 8px;
}
.icon-picker-label {
  font-size: 14px;
  color: var(--text-2);
  padding: 16px 16px 10px;
}
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 16px;
}
.icon-item {
  font-size: 26px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-item.active {
  border-color: var(--brand-500);
  background: var(--brand-50);
}
.add-submit {
  padding: 16px;
}
</style>
