import dayjs from 'dayjs'
import { defaultCategories } from '@/db/index.js'
import { showToast } from 'vant'

// 分类图标映射（从默认分类中提取）
const categoryIcons = {}
for (const type of ['expense', 'income']) {
  for (const cat of defaultCategories[type]) {
    categoryIcons[cat.name] = cat.icon
  }
}

export function getCategoryIcon(category) {
  return categoryIcons[category] || '📦'
}

export function getCategoryIcons() {
  return { ...categoryIcons }
}

export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatMoney(amount) {
  return '¥' + Number(amount).toFixed(2)
}

export function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

export function getMonthRange(date) {
  const d = dayjs(date)
  return {
    startDate: d.startOf('month').format('YYYY-MM-DD'),
    endDate: d.endOf('month').format('YYYY-MM-DD')
  }
}

export function calculateTotal(records, type = null) {
  if (!records || records.length === 0) return 0
  let list = type ? records.filter(r => r.type === type) : records
  return list.reduce((sum, r) => sum + Number(r.amount), 0)
}

// 别名，保持向后兼容
export const calcTotal = calculateTotal

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function exportToCSV(records, filename = 'account_data') {
  // 清理文件名，防止路径注入
  const safeName = String(filename).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_.-]/g, '')
  const headers = ['日期', '类型', '分类', '金额', '备注']
  const rows = records.map(r => [
    r.date,
    r.type === 'expense' ? '支出' : '收入',
    r.category,
    r.amount,
    r.note || ''
  ])
  const csv = [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${safeName}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function exportToExcel(records, filename = 'account_data') {
  const XLSXModule = await import('xlsx')
  const XLSX = XLSXModule.default || XLSXModule
  const data = records.map(r => ({
    date: r.date,
    type: r.type === 'expense' ? '支出' : '收入',
    category: r.category,
    amount: r.amount,
    note: r.note || ''
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '账单数据')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 统一错误处理
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 */
export function handleError(error, defaultMessage = '操作失败，请重试') {
  console.error('Error:', error)
  showToast({ message: defaultMessage, type: 'danger' })
}

/**
 * 解析 JSON 格式数据
 * @param {string} text - JSON 字符串
 * @returns {Array} 解析后的记录数组
 */
export function parseJSON(text) {
  const data = JSON.parse(text)
  const records = Array.isArray(data) ? data : (data.records || [])
  return records.map(normalizeRecord)
}

/**
 * 解析 CSV 格式数据
 * @param {string} text - CSV 字符串
 * @returns {Array} 解析后的记录数组
 */
export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV 文件内容不完整')
  
  // 跳过表头
  const records = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // 解析 CSV 行（处理带引号的字段）
    const fields = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    
    if (fields.length >= 4) {
      records.push(normalizeRecord({
        date: fields[0],
        type: fields[1] === '收入' ? 'income' : 'expense',
        category: fields[2],
        amount: fields[3],
        note: fields[4] || ''
      }))
    }
  }
  return records
}

/**
 * 标准化记录格式
 * @param {Object} record - 原始记录
 * @returns {Object} 标准化后的记录
 */
function normalizeRecord(record) {
  return {
    date: record.date || getToday(),
    type: record.type === 'income' ? 'income' : 'expense',
    category: record.category || '其他',
    amount: Number(record.amount) || 0,
    note: record.note || ''
  }
}

/**
 * 导入数据（自动识别 CSV/JSON 格式）
 * @param {string} text - 文件内容
 * @param {string} filename - 文件名（用于判断类型）
 * @returns {Promise<Array>} 解析后的记录数组
 */
export async function parseImportData(text, filename = '') {
  const lowerFilename = filename.toLowerCase()
  if (lowerFilename.endsWith('.json')) {
    return parseJSON(text)
  }
  // 尝试 JSON 解析，如果失败则当作 CSV
  try {
    JSON.parse(text)
    return parseJSON(text)
  } catch {
    return parseCSV(text)
  }
}

/**
 * 安全地获取数据，失败时返回默认值
 * @param {Function} fn - 异步函数
 * @param {*} defaultValue - 默认值
 * @param {string} errorMessage - 错误消息
 */
export async function safeGet(fn, defaultValue = null, errorMessage = '加载失败') {
  try {
    return await fn()
  } catch (error) {
    console.error(`safeGet error: ${errorMessage}`, error)
    showToast({ message: errorMessage, type: 'warning' })
    return defaultValue
  }
}