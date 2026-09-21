import { openDB } from 'idb'

const TOKEN_KEY = 'githubGistToken'
const GIST_ID_KEY = 'githubGistId'
const LAST_SYNC_KEY = 'lastSyncTime'

export function getSyncConfig() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    gistId: localStorage.getItem(GIST_ID_KEY) || ''
  }
}

export function setSyncConfig(token, gistId) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (gistId) localStorage.setItem(GIST_ID_KEY, gistId)
}

export function clearSyncConfig() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_ID_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY) || null
}

function setLastSyncTime() {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

async function githubApi(url, method = 'GET', body = null) {
  const { token } = getSyncConfig()
  if (!token) throw new Error('未配置 GitHub Token')

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API 错误: ${res.status}`)
  }
  return res.json()
}

// 读取本地全部数据
async function exportLocalData() {
  const db = await openDB('AccountBookDB', 1)
  const result = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: await db.getAll('accounts'),
    categories: await db.getAll('categories'),
    records: await db.getAll('records'),
    budgets: await db.getAll('budgets')
  }
  return result
}

// 创建新 gist
async function createGist(data) {
  const res = await githubApi('https://api.github.com/gists', 'POST', {
    description: '小浪出品云同步数据',
    public: false,
    files: {
      'account-book-data.json': {
        content: JSON.stringify(data)
      }
    }
  })
  localStorage.setItem(GIST_ID_KEY, res.id)
  return res.id
}

// 更新已有 gist
async function updateGist(data) {
  const { gistId } = getSyncConfig()
  if (!gistId) throw new Error('未配置 Gist ID')
  await githubApi(`https://api.github.com/gists/${gistId}`, 'PATCH', {
    files: {
      'account-book-data.json': {
        content: JSON.stringify(data)
      }
    }
  })
}

// 从 gist 拉取数据
async function fetchGistData() {
  const { gistId } = getSyncConfig()
  if (!gistId) throw new Error('未配置 Gist ID')
  const res = await githubApi(`https://api.github.com/gists/${gistId}`)
  const content = res.files['account-book-data.json']?.content
  if (!content) throw new Error('Gist 中没有数据文件')
  return JSON.parse(content)
}

// 合并数据到本地（按 id 去重，取时间戳较新的）
async function mergeData(remoteData) {
  const db = await openDB('AccountBookDB', 1)

  const stores = ['accounts', 'categories', 'records', 'budgets']
  for (const storeName of stores) {
    const local = await db.getAll(storeName)
    const remote = remoteData[storeName] || []

    const map = new Map()
    // 先放本地
    for (const item of local) {
      map.set(item.id, item)
    }
    // 合并远端（覆盖更新的）
    for (const item of remote) {
      const existing = map.get(item.id)
      if (!existing) {
        map.set(item.id, item)
      } else {
        const localTime = existing.updatedAt || existing.createdAt || 0
        const remoteTime = item.updatedAt || item.createdAt || 0
        if (remoteTime > localTime) {
          map.set(item.id, item)
        }
      }
    }

    // 清空并写入合并后的数据
    const tx = db.transaction(storeName, 'readwrite')
    await tx.store.clear()
    for (const item of map.values()) {
      await tx.store.add(item)
    }
    await tx.done
  }
}

// 上传（推送本地 → 云端）
export async function pushSync() {
  const data = await exportLocalData()
  const { gistId } = getSyncConfig()
  if (gistId) {
    await updateGist(data)
  } else {
    await createGist(data)
  }
  setLastSyncTime()
  return true
}

// 下载（拉取云端 → 本地合并）
export async function pullSync() {
  const remoteData = await fetchGistData()
  await mergeData(remoteData)
  setLastSyncTime()
  return true
}

// 双向同步：先拉后推
export async function syncNow() {
  const { gistId } = getSyncConfig()
  if (!gistId) {
    // 没有 gist，直接创建并上传
    await pushSync()
    return { type: 'created', message: '已创建云同步并上传数据' }
  }
  await pullSync()
  await pushSync()
  return { type: 'synced', message: '同步完成' }
}
