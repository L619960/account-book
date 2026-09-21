<template>
  <div class="page-container">
    <van-nav-bar title="数据导入" left-arrow @click-left="goBack" />

    <!-- 文件选择区域 -->
    <div class="card import-section">
      <div class="section-title">选择文件</div>
      <div class="file-upload" @click="triggerFileInput">
        <div class="upload-icon">
          <van-icon name="description" size="32" color="#4f6ef7" />
        </div>
        <div class="upload-text">点击上传 CSV 或 JSON 文件</div>
        <div class="upload-sub">支持 .csv / .json 格式</div>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.json"
          style="display: none"
          @change="handleFileChange"
        />
      </div>
      <div v-if="fileName" class="file-info">
        <van-icon name="success" color="#10b981" />
        <span class="file-name">{{ fileName }}</span>
        <van-icon name="close" @click="clearFile" class="file-clear" />
      </div>
    </div>

    <!-- 目标账本选择 -->
    <div class="card import-section">
      <div class="section-title">导入到</div>
      <van-dropdown-menu>
        <van-dropdown-item v-model="currentAccount" :options="accountOptions" @change="onAccountChange" />
      </van-dropdown-menu>
    </div>

    <!-- 数据预览 -->
    <div v-if="previewRecords.length > 0" class="card import-section">
      <div class="section-title">数据预览（前10条）</div>
      <div class="preview-table">
        <div class="table-header">
          <span>日期</span>
          <span>类型</span>
          <span>分类</span>
          <span>金额</span>
          <span>备注</span>
        </div>
        <div v-for="record in previewRecords" :key="record.id" class="table-row">
          <span>{{ record.date }}</span>
          <span :class="record.type === 'income' ? 'tag-income' : 'tag-expense'">{{ record.type === 'income' ? '收入' : '支出' }}</span>
          <span>{{ record.category }}</span>
          <span class="money">{{ record.amount }}</span>
          <span class="ellipsis">{{ record.note || '-' }}</span>
        </div>
      </div>
      <div class="preview-count">共 {{ parsedRecords.length }} 条记录</div>
    </div>

    <!-- 导入选项 -->
    <div v-if="parsedRecords.length > 0" class="card import-section">
      <div class="section-title">导入选项</div>
      <van-switch-cell
        v-model="skipDuplicates"
        title="跳过重复记录"
        desc="跳过日期+分类+金额相同的记录"
      />
    </div>

    <!-- 导入按钮 -->
    <div v-if="parsedRecords.length > 0" class="import-actions">
      <van-button type="primary" block round :loading="importing" @click="confirmImport">
        确认导入 ({{ parsedRecords.length }} 条)
      </van-button>
    </div>

    <!-- 导入结果弹窗 -->
    <van-popup v-model:show="showResult" position="bottom" round :style="{ height: '30%' }">
      <div class="result-content">
        <van-nav-bar :title="importSuccess ? '导入成功' : '导入失败'" @click-left="showResult = false" left-text="关闭" />
        <div style="padding: 20px">
          <div class="result-stat">
            <div class="stat-item">
              <div class="stat-value success">{{ importResult?.success || 0 }}</div>
              <div class="stat-label">导入成功</div>
            </div>
            <div class="stat-item">
              <div class="stat-value failed">{{ importResult?.failed || 0 }}</div>
              <div class="stat-label">导入失败</div>
            </div>
            <div class="stat-item">
              <div class="stat-value total">{{ importResult?.total || 0 }}</div>
              <div class="stat-label">总共</div>
            </div>
          </div>
          <div v-if="importResult?.failed > 0" class="result-tip">
            部分记录可能因格式问题导入失败，请检查文件内容
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 确认导入对话框 -->
    <van-dialog v-model:show="showConfirm" title="确认导入" @confirm="executeImport" show-cancel-button>
      <p>即将导入 {{ parsedRecords.length }} 条记录到当前账本，确定继续？</p>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore, useRecordStore } from '@/stores/index.js'
import { parseImportData } from '@/utils/index.js'
import { showToast } from 'vant'

const router = useRouter()
const accountStore = useAccountStore()
const recordStore = useRecordStore()

const fileInput = ref(null)
const fileName = ref('')
const parsedRecords = ref([])
const currentAccount = ref(null)
const accountOptions = ref([])
const skipDuplicates = ref(true)
const importing = ref(false)
const showResult = ref(false)
const showConfirm = ref(false)
const importSuccess = ref(false)
const importResult = ref(null)

const previewRecords = computed(() => {
  return parsedRecords.value.slice(0, 10).map((r, i) => ({ ...r, id: i }))
})

async function initAccounts() {
  if (accountStore.accounts.length === 0) {
    await accountStore.loadAccounts()
  }
  if (accountStore.accounts.length > 0) {
    currentAccount.value = accountStore.currentAccountId || accountStore.accounts[0].id
    accountOptions.value = accountStore.accounts.map(a => ({ text: a.name, value: a.id }))
  }
}

function onAccountChange(val) {
  currentAccount.value = Number(val)
}

function triggerFileInput() {
  fileInput.value?.click()
}

function clearFile() {
  fileName.value = ''
  parsedRecords.value = []
  fileInput.value.value = ''
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  fileName.value = file.name

  try {
    const text = await file.text()
    const records = await parseImportData(text, file.name)

    if (records.length === 0) {
      showToast({ message: '文件中没有有效记录', type: 'warning' })
      clearFile()
      return
    }

    parsedRecords.value = records
    showToast({ message: `解析成功，共 ${records.length} 条记录`, type: 'success' })
  } catch (error) {
    console.error('解析文件失败:', error)
    showToast({ message: '解析失败: ' + (error.message || '文件格式错误'), type: 'danger' })
    clearFile()
  }
}

function confirmImport() {
  showConfirm.value = true
}

async function executeImport() {
  importing.value = true
  showConfirm.value = false

  try {
    const accountId = currentAccount.value
    if (!accountId) {
      showToast({ message: '请先选择目标账本', type: 'warning' })
      return
    }

    let recordsToImport = parsedRecords.value
    if (skipDuplicates.value) {
      const existingRecords = await recordStore.getRecords(accountId, {})
      const existingSet = new Set(
        existingRecords.map(r => `${r.date}_${r.category}_${r.amount}`)
      )

      recordsToImport = parsedRecords.value.filter(r => {
        const key = `${r.date}_${r.category}_${r.amount}`
        return !existingSet.has(key)
      })
    }

    if (recordsToImport.length === 0 && skipDuplicates.value) {
      showToast({ message: '没有新记录需要导入', type: 'info' })
      importing.value = false
      return
    }

    const result = await recordStore.importRecords(recordsToImport, accountId)

    importResult.value = result
    importSuccess.value = result.failed === 0
    showResult.value = true

    await recordStore.loadRecords(accountId, {})

    if (result.failed > 0) {
      showToast({ message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`, type: 'warning' })
    } else {
      showToast({ message: `成功导入 ${result.success} 条记录`, type: 'success' })
    }

    clearFile()
  } catch (error) {
    console.error('导入失败:', error)
    showToast({ message: '导入失败: ' + (error.message || error), type: 'danger' })
  } finally {
    importing.value = false
  }
}

function goBack() {
  router.back()
}

initAccounts()
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--text-1);
}

.file-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
  border: 2px dashed #d6dae6;
  border-radius: var(--radius-md);
  background: #fafbff;
  cursor: pointer;
  transition: all 0.3s;
}
.file-upload:active {
  border-color: var(--brand-500);
  background: var(--brand-50);
}
.upload-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--brand-50);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.upload-text {
  font-size: 14px;
  color: var(--text-1);
  font-weight: 500;
}
.upload-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-top: 12px;
  background: #f5f7fa;
  border-radius: var(--radius-sm);
  font-size: 14px;
}
.file-name {
  flex: 1;
  color: var(--text-1);
}
.file-clear {
  color: #c8c9cc;
  cursor: pointer;
}

.preview-table {
  margin-top: 4px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.table-header,
.table-row {
  display: flex;
  padding: 9px 0;
  font-size: 13px;
  align-items: center;
}
.table-header {
  font-weight: 600;
  color: var(--text-2);
  background: #f5f7fa;
  padding: 10px 8px;
}
.table-row {
  border-bottom: 1px solid var(--border);
  padding: 9px 8px;
}
.table-row span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-1);
}
.table-row span:nth-child(1) { flex: 1.2; }
.table-row span:nth-child(2) { flex: 0.8; }
.table-row span:nth-child(3) { flex: 1; }
.table-row span:nth-child(4) { flex: 0.8; text-align: right; }
.table-row span:nth-child(5) { flex: 1.5; }
.tag-income { color: var(--income); font-weight: 600; }
.tag-expense { color: var(--expense); font-weight: 600; }
.ellipsis { color: var(--text-3); }

.preview-count {
  text-align: center;
  padding: 12px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.import-actions {
  margin: 20px 0;
  padding: 0 16px;
}

.result-content {
  background: #fff;
  height: 100%;
}
.result-stat {
  display: flex;
  justify-content: space-around;
  padding: 30px 0;
}
.stat-item {
  text-align: center;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}
.stat-value.success { color: var(--income); }
.stat-value.failed { color: var(--expense); }
.stat-value.total { color: var(--brand-500); }
.stat-label {
  font-size: 14px;
  color: var(--text-3);
}
.result-tip {
  padding: 12px;
  background: #fff7ec;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: #d97706;
  margin-top: 16px;
}
</style>
