import { ref, onMounted } from 'vue'
import { useAccountStore, useRecordStore, useCategoryStore, useBudgetStore } from '@/stores/index.js'

/**
 * 账本切换 composable
 * 统一处理账本切换、数据加载等逻辑
 */
export function useAccountSwitch() {
  const accountStore = useAccountStore()
  const recordStore = useRecordStore()
  const categoryStore = useCategoryStore()
  const budgetStore = useBudgetStore()

  const currentAccount = ref(null)
  const accountOptions = ref([])

  async function initAccount(accountId = null) {
    if (accountStore.accounts.length === 0) {
      await accountStore.loadAccounts()
    }

    if (accountStore.accounts.length > 0) {
      accountOptions.value = accountStore.accounts.map(a => ({ text: a.name, value: a.id }))
      if (!currentAccount.value) {
        // 优先使用传入的参数，其次使用 store 中的值，最后使用第一个账本
        const id = Number(accountId)
        currentAccount.value = Number.isFinite(id) ? id : (accountStore.currentAccountId || accountStore.accounts[0].id)
      }
    }
  }

  async function switchAccount(id) {
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) return
    currentAccount.value = numericId
    accountStore.currentAccountId = numericId
  }

  async function loadData(options = {}) {
    // 确保账本已初始化（解决 onMounted 异步竞态问题）
    await initAccount()

    // 使用局部变量保存当前账户，避免在异步过程中被覆盖
    const accountId = currentAccount.value
    if (!accountId || !Number.isFinite(Number(accountId))) return

    const numericAccountId = Number(accountId)

    if (options.loadCategories) {
      await categoryStore.loadCategories(numericAccountId, options.categoryType || 'expense')
    }

    if (options.loadBudgets) {
      await budgetStore.loadBudgets(numericAccountId)
    }

    if (options.loadRecords) {
      await recordStore.loadRecords(numericAccountId, options.recordOptions || {})
    }
  }

  onMounted(() => {
    initAccount()
  })

  return {
    currentAccount,
    accountOptions,
    switchAccount,
    loadData,
    accountStore,
    recordStore,
    categoryStore,
    budgetStore
  }
}
