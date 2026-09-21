import { openDB } from 'idb'
const DB_NAME = 'AccountBookDB'
const DB_VERSION = 1

let dbInstance = null

export async function initDB() {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true })
        s.createIndex('accountId', 'accountId')
        s.createIndex('type', 'type')
        s.createIndex('category', 'category')
        s.createIndex('date', 'date')
        s.createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('categories')) {
        const s = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true })
        s.createIndex('type', 'type')
        s.createIndex('accountId', 'accountId')
      }
      if (!db.objectStoreNames.contains('budgets')) {
        const s = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true })
        s.createIndex('accountId', 'accountId')
        s.createIndex('month', 'month')
        s.createIndex('categoryId', 'categoryId')
      }
    }
  })
  return dbInstance
}

async function dbOp(op) {
  const db = await initDB()
  return op(db)
}

export async function getRecords(accountId, opts = {}) {
  return dbOp(async (db) => {
    let records
    
    // 使用单一事务进行查询
    const tx = db.transaction('records', 'readonly')
    const store = tx.store
    
    // 确保 accountId 是数字类型
    const numericAccountId = Number(accountId)
    
    if (opts.startDate && opts.endDate && numericAccountId) {
      // 范围查询：按日期范围和账户
      // 注意：getAll(query, count) 的第二个参数是数量，不是结束日期
      // 必须用 IDBKeyRange.bound 创建日期范围作为单个 query 参数
      const dateRange = IDBKeyRange.bound(opts.startDate, opts.endDate)
      const dateIndex = store.index('date')
      const allInDateRange = await dateIndex.getAll(dateRange)
      records = allInDateRange.filter(r => r.accountId === numericAccountId)
    } else if (opts.startDate && opts.endDate) {
      // 范围查询：仅按日期
      const dateRange = IDBKeyRange.bound(opts.startDate, opts.endDate)
      const dateIndex = store.index('date')
      records = await dateIndex.getAll(dateRange)
    } else if (numericAccountId && Number.isFinite(numericAccountId)) {
      // 按账户查询
      const accountIndex = store.index('accountId')
      records = await accountIndex.getAll(numericAccountId)
    } else {
      // 获取所有记录
      records = await store.getAll()
    }
    
    // 应用其他过滤条件
    let r = records.filter(rec => {
      if (opts.type && rec.type !== opts.type) return false
      if (opts.category && rec.category !== opts.category) return false
      if (opts.startDate && rec.date < opts.startDate) return false
      if (opts.endDate && rec.date > opts.endDate) return false
      return true
    })
    return r.sort((a, b) => b.createdAt - a.createdAt)
  })
}

export async function addRecord(rec) {
  return dbOp(async (db) => {
    const tx = db.transaction('records', 'readwrite')
    const id = await tx.store.add({ ...rec, createdAt: Date.now() })
    await tx.done; return id
  })
}

export async function updateRecord(id, rec) {
  return dbOp(async (db) => {
    const tx = db.transaction('records', 'readwrite')
    const ex = await tx.store.get(id)
    if (ex) await tx.store.put({ ...ex, ...rec, updatedAt: Date.now() })
    await tx.done
  })
}

export async function deleteRecord(id) {
  return dbOp(async (db) => {
    const tx = db.transaction('records', 'readwrite')
    await tx.store.delete(id); await tx.done
  })
}

export async function getAccounts() {
  return dbOp(async (db) => (await db.transaction('accounts', 'readonly').store.getAll()).sort((a, b) => b.createdAt - a.createdAt))
}

export async function addAccount(acct) {
  return dbOp(async (db) => {
    const tx = db.transaction('accounts', 'readwrite')
    const id = await tx.store.add({ ...acct, createdAt: Date.now() })
    await tx.done; return id
  })
}

export async function deleteAccount(id) {
  return dbOp(async (db) => {
    // 使用单个事务确保原子性，防止部分删除导致数据不一致
    const tx = db.transaction(['accounts', 'records', 'budgets', 'categories'], 'readwrite')
    
    // 删除账本
    await tx.objectStore('accounts').delete(id)
    
    // 删除该账本下的所有记录
    const recordsStore = tx.objectStore('records')
    const recordsIndex = recordsStore.index('accountId')
    const recordsToDelete = await recordsIndex.getAll(id)
    for (const record of recordsToDelete) {
      await recordsStore.delete(record.id)
    }
    
    // 删除该账本下的所有预算
    const budgetsStore = tx.objectStore('budgets')
    const budgetsIndex = budgetsStore.index('accountId')
    const budgetsToDelete = await budgetsIndex.getAll(id)
    for (const budget of budgetsToDelete) {
      await budgetsStore.delete(budget.id)
    }
    
    // 删除该账本下的所有分类
    const categoriesStore = tx.objectStore('categories')
    const categoriesIndex = categoriesStore.index('accountId')
    const categoriesToDelete = await categoriesIndex.getAll(id)
    for (const category of categoriesToDelete) {
      await categoriesStore.delete(category.id)
    }
    
    await tx.done
  })
}

export async function getCategories(accountId, type = 'all') {
  return dbOp(async (db) => {
    const tx = db.transaction('categories', 'readonly')
    let cats = await tx.store.getAll()
    if (type !== 'all') {
      cats = cats.filter(c => c.type === type)
    }
    if (accountId) {
      cats = cats.filter(c => c.accountId === accountId || c.isDefault)
    }
    return cats.sort((a, b) => (b.sort || 0) - (a.sort || 0))
  })
}

export async function addCategory(cat) {
  return dbOp(async (db) => {
    const tx = db.transaction('categories', 'readwrite')
    const id = await tx.store.add({ ...cat, isDefault: false, createdAt: Date.now() })
    await tx.done; return id
  })
}

export async function deleteCategory(id) {
  return dbOp(async (db) => {
    const tx = db.transaction('categories', 'readwrite')
    await tx.store.delete(id); await tx.done
  })
}

export async function getBudgets(accountId) {
  return dbOp(async (db) => {
    const tx = db.transaction('budgets', 'readonly')
    let budgets

    // 确保 accountId 是有效数字
    const numericAccountId = Number(accountId)
    if (numericAccountId && Number.isFinite(numericAccountId)) {
      // 使用 accountId 索引进行查询
      const budgetStore = tx.store
      const accountIdIndex = budgetStore.index('accountId')
      budgets = await accountIdIndex.getAll(numericAccountId)
    } else {
      budgets = await tx.store.getAll()
    }

    return budgets.sort((a, b) => b.createdAt - a.createdAt)
  })
}

export async function addBudget(budget) {
  return dbOp(async (db) => {
    const tx = db.transaction('budgets', 'readwrite')
    const id = await tx.store.add({ ...budget, createdAt: Date.now() })
    await tx.done; return id
  })
}

export async function updateBudget(id, budget) {
  return dbOp(async (db) => {
    const tx = db.transaction('budgets', 'readwrite')
    const ex = await tx.store.get(id)
    if (ex) await tx.store.put({ ...ex, ...budget, updatedAt: Date.now() })
    await tx.done
  })
}

export async function deleteBudget(id) {
  return dbOp(async (db) => {
    const tx = db.transaction('budgets', 'readwrite')
    await tx.store.delete(id); await tx.done
  })
}

export const defaultCategories = {
  expense: [
    { name: '餐饮', icon: '🍜' }, { name: '交通', icon: '🚗' },
    { name: '购物', icon: '🛍️' }, { name: '娱乐', icon: '🎮' },
    { name: '住房', icon: '🏠' }, { name: '医疗', icon: '💊' },
    { name: '教育', icon: '📚' }, { name: '通讯', icon: '📱' },
    { name: '服饰', icon: '👕' }, { name: '其他', icon: '📦' }
  ],
  income: [
    { name: '工资', icon: '💰' }, { name: '奖金', icon: '🎁' },
    { name: '兼职', icon: '💼' }, { name: '投资', icon: '📈' },
    { name: '红包', icon: '🧧' }, { name: '退款', icon: '💸' },
    { name: '其他', icon: '📦' }
  ]
}