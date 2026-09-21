import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getAccounts, addAccount, deleteAccount, initDB } from '@/db/index.js'
import { getCategories, addCategory, deleteCategory, defaultCategories } from '@/db/index.js'
import { getRecords as fetchRecords, addRecord, deleteRecord, updateRecord } from '@/db/index.js'
import { getBudgets, addBudget, deleteBudget, updateBudget } from '@/db/index.js'

const CURRENT_ACCOUNT_KEY = 'currentAccountId'

function readSavedAccountId() {
  const raw = localStorage.getItem(CURRENT_ACCOUNT_KEY)
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export const useAccountStore = defineStore('account', () => {
  const accounts = ref([])
  const currentAccountId = ref(readSavedAccountId())
  let loadPromise = null

  watch(currentAccountId, (id) => {
    if (id == null) localStorage.removeItem(CURRENT_ACCOUNT_KEY)
    else localStorage.setItem(CURRENT_ACCOUNT_KEY, String(id))
  })

  async function loadAccounts() {
    if (loadPromise) return loadPromise
    loadPromise = loadAccountsOnce().finally(() => {
      loadPromise = null
    })
    return loadPromise
  }

  async function loadAccountsOnce() {
    try {
      accounts.value = await getAccounts()
      if (accounts.value.length === 0) {
        await createDefaultAccount()
      } else if (!currentAccountId.value || !accounts.value.find(a => a.id === currentAccountId.value)) {
        currentAccountId.value = accounts.value[0].id
      }
    } catch (error) {
      console.error('Store: 加载账本失败:', error)
      throw error
    }
  }

  async function createDefaultAccount() {
    const id = await addAccount({ name: '默认账本', color: '#ff976a' })
    accounts.value = await getAccounts()
    currentAccountId.value = id
    await loadDefaultCategories(id)
  }

  async function loadDefaultCategories(accountId) {
    for (let i = 0; i < defaultCategories.expense.length; i++) {
      await addCategory({ name: defaultCategories.expense[i].name, icon: defaultCategories.expense[i].icon, type: 'expense', accountId, sort: i })
    }
    for (let i = 0; i < defaultCategories.income.length; i++) {
      await addCategory({ name: defaultCategories.income[i].name, icon: defaultCategories.income[i].icon, type: 'income', accountId, sort: i })
    }
  }

  async function addAccountItem(account) {
    const id = await addAccount(account)
    accounts.value = await getAccounts()
    await loadDefaultCategories(id)
    return id
  }

  async function deleteAccountById(id) {
    await deleteAccount(id)
    accounts.value = await getAccounts()
    if (currentAccountId.value === id && accounts.value.length > 0) {
      currentAccountId.value = accounts.value[0].id
    }
  }

  async function getAccountsList() {
    return await getAccounts()
  }

  return { accounts, currentAccountId, loadAccounts, addAccountItem, deleteAccountById, getAccountsList }
})

export const useCategoryStore = defineStore('category', () => {
  const categories = ref([])

  async function loadCategories(accountId, type = 'all') {
    categories.value = await getCategories(accountId, type)
  }

  async function addCategoryItem(category) {
    const id = await addCategory(category)
    await loadCategories(category.accountId, category.type)
    return id
  }

  async function deleteCategoryById(id) {
    await deleteCategory(id)
    // 重新加载当前分类列表
    if (categories.value.length > 0) {
      const sampleCategory = categories.value[0]
      await loadCategories(sampleCategory.accountId, sampleCategory.type)
    }
  }

  async function getCategoriesList(accountId, type = 'all') {
    return await getCategories(accountId, type)
  }

  return { categories, loadCategories, addCategoryItem, deleteCategoryById, getCategoriesList }
})

export const useRecordStore = defineStore('record', () => {
  const records = ref([])

  async function loadRecords(accountId, options = {}) {
    if (!accountId) return
    records.value = await fetchRecords(accountId, options)
  }

  async function addRecordItem(record) {
    const id = await addRecord(record)
    // 如果当前有加载记录，刷新列表
    if (records.value && record.accountId) {
      records.value = await fetchRecords(record.accountId, {})
    }
    return id
  }

  async function deleteRecordItem(id) {
    await deleteRecord(id)
    // 从本地列表中移除
    if (records.value) {
      records.value = records.value.filter(r => r.id !== id)
    }
  }

  async function updateRecordItem(id, record) {
    await updateRecord(id, record)
    // 更新本地列表中的记录
    if (records.value) {
      const index = records.value.findIndex(r => r.id === id)
      if (index !== -1) {
        records.value[index] = { ...records.value[index], ...record, updatedAt: Date.now() }
      }
    }
  }

  async function getRecords(accountId, options = {}) {
    return await fetchRecords(accountId, options)
  }

  /**
   * 批量导入记录
   * @param {Array} records - 记录数组
   * @param {number} accountId - 账本 ID
   * @returns {Object} 导入结果 { success, failed, total }
   */
  async function importRecords(records, accountId) {
    const now = Date.now()
    let success = 0
    let failed = 0
    const validRecords = []
    
    for (const record of records) {
      try {
        // 验证记录格式
        if (!record.type || !record.category || !record.amount || !record.date) {
          failed++
          continue
        }
        
        // 验证金额
        const amount = Number(record.amount)
        if (isNaN(amount) || amount <= 0) {
          failed++
          continue
        }
        
        // 验证日期格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
          failed++
          continue
        }
        
        validRecords.push({
          ...record,
          amount,
          accountId,
          createdAt: now
        })
      } catch {
        failed++
      }
    }
    
    // 批量插入数据库
    const db = await initDB()
    const tx = db.transaction('records', 'readwrite')
    
    for (const record of validRecords) {
      await tx.store.add(record)
      success++
    }
    
    await tx.done
    
    // 刷新本地列表
    records.value = await fetchRecords(accountId, {})
    
    return { success, failed, total: records.length }
  }

  return { records, loadRecords, addRecordItem, deleteRecordItem, updateRecordItem, getRecords, importRecords }
})
export const useBudgetStore = defineStore('budget', () => {
  const budgets = ref([])

  async function loadBudgets(accountId) {
    budgets.value = await getBudgets(accountId)
  }

  async function addBudgetItem(budget) {
    await addBudget(budget)
    await loadBudgets(budget.accountId)
  }

  async function deleteBudgetItem(id) {
    await deleteBudget(id)
    // 重新加载预算列表
    if (budgets.value.length > 0) {
      const sampleBudget = budgets.value[0]
      await loadBudgets(sampleBudget.accountId)
    }
  }

  async function updateBudgetItem(id, budget) {
    await updateBudget(id, budget)
    await loadBudgets(budget.accountId)
  }

  return { budgets, loadBudgets, addBudgetItem, deleteBudgetItem, updateBudgetItem }
})