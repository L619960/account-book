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
      <div class="about-item">H5记账本 v1.0</div>
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

const router = useRouter()
const accountStore = useAccountStore()
const recordStore = useRecordStore()

const accounts = ref([])
const showAddAccountDialog = ref(false)
const showDeleteDialog = ref(false)
const newAccountName = ref('')
const deletingAccount = ref(null)

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

onMounted(async () => {
  accounts.value = await accountStore.getAccountsList() || []
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
