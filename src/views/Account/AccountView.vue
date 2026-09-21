<template>
  <div class="page-container">
    <van-nav-bar title="我的" />

    <!-- 用户信息卡 -->
    <div class="profile-card">
      <div class="profile-avatar">账</div>
      <div class="profile-info">
        <div class="profile-name">{{ currentAccountName || '默认账本' }}</div>
        <div class="profile-desc">本地存储 · 隐私安全</div>
      </div>
    </div>

    <!-- 账本管理 -->
    <div class="card section">
      <div class="section-title">账本管理</div>
      <div class="account-list">
        <div v-for="account in accounts" :key="account.id" class="account-item">
          <div class="account-info">
            <div class="account-name">{{ account.name }}</div>
            <div class="account-date">创建于 {{ dayjs(account.createdAt).format('YYYY-MM-DD') }}</div>
          </div>
          <div v-if="account.id !== accountStore.currentAccountId" class="account-actions">
            <van-button size="mini" type="primary" plain @click="switchAccount(account.id)">切换</van-button>
            <van-button size="mini" type="danger" plain @click="confirmDelete(account)" :disabled="account.id === getDefaultAccountId()">删除</van-button>
          </div>
          <van-tag v-else type="primary" round>当前</van-tag>
        </div>
      </div>
      <van-button type="primary" block round class="add-account-btn" icon="plus" @click="showAddAccountDialog = true">新建账本</van-button>
    </div>

    <!-- 云同步 -->
    <div class="card section">
      <div class="section-title">云同步</div>
      <div v-if="!syncConfigured" class="sync-setup">
        <div class="sync-desc">
          使用 GitHub Gist 实现多端同步。需要一个 GitHub Personal Access Token（只读 gist 权限即可）。
        </div>
        <van-field
          v-model="githubToken"
          label="GitHub Token"
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          clearable
        />
        <div class="sync-help">
          没有 Token？<a href="https://github.com/settings/tokens/new?scopes=gist&description=H5%E8%AE%B0%E8%B4%A6%E6%9C%AC" target="_blank" rel="noopener">点这里创建</a>（只需勾选 gist 权限）
        </div>
        <van-button type="primary" block round class="sync-btn" @click="setupSync" :loading="syncLoading">
          开启云同步
        </van-button>
      </div>
      <div v-else class="sync-status">
        <div class="sync-info">
          <span class="sync-dot online"></span>
          <span>云同步已开启</span>
        </div>
        <div v-if="lastSyncTime" class="sync-time">上次同步：{{ lastSyncTime }}</div>
        <div class="sync-actions">
          <van-button size="small" type="primary" plain @click="doSync" :loading="syncLoading">立即同步</van-button>
          <van-button size="small" type="danger" plain @click="disableSync">关闭同步</van-button>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="card section">
      <div class="section-title">数据管理</div>
      <div class="menu-list">
        <div class="menu-item" @click="goToCategory">
          <div class="menu-left"><span class="menu-icon" style="background:#e0e7ff">🏷️</span><span>分类管理</span></div>
          <van-icon name="arrow" class="menu-arrow" />
        </div>
        <div class="menu-item" @click="importData">
          <div class="menu-left"><span class="menu-icon" style="background:#dcfce7">📥</span><span>导入数据</span></div>
          <van-icon name="arrow" class="menu-arrow" />
        </div>
        <div class="menu-item" @click="exportData">
          <div class="menu-left"><span class="menu-icon" style="background:#cffafe">📤</span><span>导出数据</span></div>
          <van-icon name="arrow" class="menu-arrow" />
        </div>
        <div class="menu-item danger" @click="clearData">
          <div class="menu-left"><span class="menu-icon" style="background:#fee2e2">🗑️</span><span>清空数据</span></div>
          <van-icon name="arrow" class="menu-arrow" />
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="card section about-card">
      <div class="about-logo">账</div>
      <div class="about-item">小浪出品 v1.0</div>
      <div class="about-desc">本地存储，隐私安全</div>
    </div>
  </div>

  <!-- 新建账本弹窗 -->
  <van-popup v-model:show="showAddAccountDialog" position="bottom" round :style="{ height: '30%' }">
    <van-form @submit="createAccount">
      <van-cell-group inset style="margin-top: 16px">
        <van-field v-model="newAccountName" label="账本名称" placeholder="请输入账本名称" required />
      </van-cell-group>
      <div style="padding: 16px">
        <van-button round block type="primary" native-type="submit">创建</van-button>
      </div>
    </van-form>
  </van-popup>

  <!-- 确认删除弹窗 -->
  <van-dialog v-model:show="showDeleteDialog" title="确认删除" @confirm="handleDeleteAccount" show-cancel-button>
    <p>确定要删除账本「{{ deletingAccount?.name }}」吗？<br>该账本下的所有数据将被清除！</p>
  </van-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/index.js'
import { exportToCSV } from '@/utils/index.js'
import { useRecordStore } from '@/stores/index.js'
import { showDialog, showToast } from 'vant'
import { openDB } from 'idb'
import dayjs from 'dayjs'
import { getSyncConfig, setSyncConfig, clearSyncConfig, getLastSyncTime, syncNow } from '@/utils/sync.js'

const router = useRouter()
const accountStore = useAccountStore()
const recordStore = useRecordStore()

const accounts = ref([])
const showAddAccountDialog = ref(false)
const showDeleteDialog = ref(false)
const newAccountName = ref('')
const deletingAccount = ref(null)

// 云同步
const githubToken = ref('')
const syncLoading = ref(false)
const syncConfigured = ref(false)
const lastSyncTime = ref('')

const currentAccountName = computed(() => {
  const cur = accounts.value.find(a => a.id === accountStore.currentAccountId)
  return cur?.name
})

function getDefaultAccountId() {
  return accountStore.accounts.find(a => a.name === '默认账本')?.id
}

function switchAccount(id) {
  accountStore.currentAccountId = id
  showToast({ message: '已切换账本', type: 'success' })
  setTimeout(() => router.push('/'), 500)
}

async function createAccount() {
  if (!newAccountName.value.trim()) {
    showToast({ message: '请输入账本名称', type: 'warning' })
    return
  }

  try {
    await accountStore.addAccountItem({ name: newAccountName.value, color: '#4f6ef7' })
    accounts.value = await accountStore.getAccountsList()
    showAddAccountDialog.value = false
    newAccountName.value = ''
    showToast({ message: '创建成功', type: 'success' })
  } catch (error) {
    console.error('创建账本失败:', error)
    showToast({ message: '创建失败，请重试', type: 'danger' })
  }
}

function confirmDelete(account) {
  deletingAccount.value = account
  showDeleteDialog.value = true
}

async function handleDeleteAccount() {
  try {
    await accountStore.deleteAccountById(deletingAccount.value.id)
    accounts.value = await accountStore.getAccountsList()
    showDeleteDialog.value = false
    showToast({ message: '删除成功', type: 'success' })
  } catch (error) {
    console.error('删除账本失败:', error)
    showToast({ message: '删除失败', type: 'danger' })
  }
}

function exportData() {
  showDialog({ message: '是否确认导出所有账单数据？' }).then(async () => {
    try {
      const records = await recordStore.getRecords(accountStore.currentAccountId)
      exportToCSV(records || [], '账本数据_' + dayjs().format('YYYYMMDD'))
      showToast({ message: '导出成功', type: 'success' })
    } catch (error) {
      showToast({ message: '导出失败', type: 'danger' })
    }
  })
}

function importData() {
  router.push('/import')
}

function clearData() {
  showDialog({ title: '清空数据', message: '确定要清空所有数据吗？此操作不可恢复！' }).then(async () => {
    try {
      const db = await openDB('AccountBookDB', 1)
      const names = [...db.objectStoreNames]
      const tx = db.transaction(names, 'readwrite')
      await Promise.all(names.map((name) => tx.objectStore(name).clear()))
      await tx.done
      localStorage.removeItem('currentAccountId')
      showToast({ message: '数据已清空', type: 'success' })
      setTimeout(() => location.reload(), 500)
    } catch (error) {
      console.error('清空数据失败:', error)
      showToast({ message: '清空失败', type: 'danger' })
    }
  })
}

function goToCategory() {
  router.push('/category')
}

async function setupSync() {
  if (!githubToken.value.trim()) {
    showToast({ message: '请输入 GitHub Token', type: 'warning' })
    return
  }
  syncLoading.value = true
  try {
    setSyncConfig(githubToken.value.trim(), '')
    await syncNow()
    syncConfigured.value = true
    githubToken.value = ''
    updateSyncTime()
    showToast({ message: '云同步已开启', type: 'success' })
  } catch (e) {
    clearSyncConfig()
    showToast({ message: e.message || 'Token 无效，请检查', type: 'danger' })
  } finally {
    syncLoading.value = false
  }
}

async function doSync() {
  syncLoading.value = true
  try {
    const result = await syncNow()
    updateSyncTime()
    showToast({ message: result.message, type: 'success' })
    // 刷新页面数据
    await accountStore.loadAccounts()
    accounts.value = await accountStore.getAccountsList()
  } catch (e) {
    showToast({ message: e.message || '同步失败', type: 'danger' })
  } finally {
    syncLoading.value = false
  }
}

function disableSync() {
  showDialog({ title: '关闭云同步', message: '关闭后将不再自动同步，本地数据保留。确定关闭吗？' }).then(() => {
    clearSyncConfig()
    syncConfigured.value = false
    lastSyncTime.value = ''
    showToast({ message: '已关闭云同步', type: 'success' })
  })
}

function updateSyncTime() {
  const t = getLastSyncTime()
  if (t) lastSyncTime.value = dayjs(t).format('MM-DD HH:mm')
}

onMounted(async () => {
  accounts.value = await accountStore.getAccountsList() || []
  const cfg = getSyncConfig()
  syncConfigured.value = !!(cfg.token && cfg.gistId)
  updateSyncTime()
})
</script>

<style scoped>
/* 用户信息卡 */
.profile-card {
  background: var(--brand-gradient);
  border-radius: var(--radius-lg);
  padding: 24px 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
}
.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}
.profile-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.profile-desc {
  font-size: 13px;
  opacity: 0.85;
}

.section {
  margin-bottom: 14px;
  padding: 18px;
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--text-1);
}

/* 账本列表 */
.account-list {
  margin-bottom: 14px;
}
.account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}
.account-item + .account-item {
  border-top: 1px solid var(--border);
}
.account-name {
  font-weight: 600;
  font-size: 15px;
}
.account-date {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
}
.account-actions {
  display: flex;
  gap: 8px;
}
.add-account-btn {
  margin-top: 4px;
}

/* 菜单列表 */
.menu-list {
  margin: 0 -4px;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 4px;
  cursor: pointer;
}
.menu-item + .menu-item {
  border-top: 1px solid var(--border);
}
.menu-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--text-1);
}
.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.menu-arrow {
  color: #c8c9cc;
  font-size: 16px;
}
.menu-item.danger .menu-left {
  color: var(--expense);
}

/* 云同步 */
.sync-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
  margin-bottom: 12px;
}
.sync-help {
  font-size: 12px;
  color: var(--text-3);
  margin: 8px 0 12px;
}
.sync-help a {
  color: var(--brand-600);
  text-decoration: none;
}
.sync-btn {
  margin-top: 4px;
}
.sync-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 6px;
}
.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.sync-dot.online {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}
.sync-time {
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 12px;
}
.sync-actions {
  display: flex;
  gap: 10px;
}

/* 关于 */
.about-card {
  text-align: center;
  padding: 24px 18px;
}
.about-logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin: 0 auto 12px;
}
.about-item {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.about-desc {
  font-size: 13px;
  color: var(--text-3);
}
</style>
