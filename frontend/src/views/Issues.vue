<template>
  <div class="issues-page">
    <div class="page-header">
      <div class="header-left">
        <h2>问题清单</h2>
        <p>跟踪和管理各中心问题</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 新增问题
        </el-button>
      </div>
    </div>
    
    <!-- 问题统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-item danger">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item warning">
          <div class="stat-value">{{ stats.inProgress }}</div>
          <div class="stat-label">处理中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item success">
          <div class="stat-value">{{ stats.resolved }}</div>
          <div class="stat-label">已解决</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item">
          <div class="stat-value">{{ stats.high }}</div>
          <div class="stat-label">高优先级</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 筛选和列表 -->
    <el-card>
      <div class="filter-bar">
        <el-select v-model="filterDept" placeholder="按中心筛选" clearable style="width: 150px">
          <el-option label="营销中心" value="1" />
          <el-option label="产品中心" value="2" />
          <el-option label="运营中心" value="3" />
        </el-select>
        
        <el-select v-model="filterStatus" placeholder="按状态筛选" clearable style="width: 150px">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="in_progress" />
          <el-option label="已解决" value="resolved" />
          <el-option label="挂起" value="suspended" />
        </el-select>
        
        <el-select v-model="filterSeverity" placeholder="按严重程度" clearable style="width: 150px">
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>
      </div>
      
      <el-table :data="filteredIssues" style="width: 100%">
        <el-table-column prop="issue_no" label="编号" width="120" />
        <el-table-column prop="dept_name" label="中心" width="100" />
        <el-table-column prop="description" label="问题描述" min-width="200">
          <template #default="{ row }">
            <div class="issue-desc">
              <el-tag :type="getSeverityType(row.severity)" size="small">
                {{ getSeverityText(row.severity) }}
              </el-tag>
              {{ row.description }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ getCategoryText(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsible_name" label="责任人" width="100" align="center" />
        <el-table-column prop="discovered_at" label="发现日期" width="110" align="center" />
        <el-table-column prop="planned_finish" label="计划完成" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row) }">{{ row.planned_finish }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleIssue(row)">处理</el-button>
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增问题对话框 -->
    <el-dialog v-model="dialogVisible" title="新增问题" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="所属中心" prop="dept_id">
          <el-select v-model="form.dept_id" placeholder="请选择中心" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="问题描述" prop="description">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="3"
            placeholder="请详细描述问题"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="问题类型">
              <el-select v-model="form.category" style="width: 100%">
                <el-option label="质量问题" value="quality" />
                <el-option label="交付问题" value="delivery" />
                <el-option label="协作问题" value="collaboration" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="严重程度">
              <el-select v-model="form.severity" style="width: 100%">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="责任人">
              <el-select v-model="form.responsible_id" style="width: 100%">
                <el-option label="张三" :value="1" />
                <el-option label="李四" :value="2" />
                <el-option label="王五" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划完成">
              <el-date-picker 
                v-model="form.planned_finish" 
                type="date" 
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="问题来源">
          <el-select v-model="form.source" style="width: 100%">
            <el-option label="周报" value="weekly_report" />
            <el-option label="会议" value="meeting" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
    
    <!-- 处理问题对话框 -->
    <el-dialog v-model="handleDialogVisible" title="处理问题" width="600px">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="问题描述">
          <div>{{ selectedIssue?.description }}</div>
        </el-form-item>
        
        <el-form-item label="处理状态">
          <el-select v-model="handleForm.status" style="width: 100%">
            <el-option label="处理中" value="in_progress" />
            <el-option label="已解决" value="resolved" />
            <el-option label="挂起" value="suspended" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="解决措施">
          <el-input 
            v-model="handleForm.solution" 
            type="textarea" 
            :rows="3"
            placeholder="请描述采取的解决措施"
          />
        </el-form-item>
        
        <el-form-item label="完成时间">
          <el-date-picker 
            v-model="handleForm.actual_finish" 
            type="date" 
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveHandle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const dialogVisible = ref(false)
const handleDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
const selectedIssue = ref(null)

const filterDept = ref('')
const filterStatus = ref('')
const filterSeverity = ref('')

const issues = ref([
  { id: 1, issue_no: 'P2026040001', dept_id: 1, dept_name: '营销中心', description: '回款达成率仅75%，距目标差距95万元', category: 'quality', severity: 'high', responsible_id: 1, responsible_name: '张三', discovered_at: '2026-04-01', planned_finish: '2026-04-15', status: 'in_progress', solution: '' },
  { id: 2, issue_no: 'P2026040002', dept_id: 2, dept_name: '产品中心', description: '出厂合格率连续2周下降，本周98.2%', category: 'quality', severity: 'high', responsible_id: 2, responsible_name: '李四', discovered_at: '2026-04-03', planned_finish: '2026-04-10', status: 'pending', solution: '' },
  { id: 3, issue_no: 'P2026040003', dept_id: 2, dept_name: '产品中心', description: '原材料供应商交期不稳定，影响生产排期', category: 'delivery', severity: 'medium', responsible_id: 2, responsible_name: '李四', discovered_at: '2026-03-20', planned_finish: '2026-04-20', status: 'in_progress', solution: '' },
  { id: 4, issue_no: 'P2026040004', dept_id: 3, dept_name: '运营中心', description: '采购专员岗位空缺超30天', category: 'other', severity: 'medium', responsible_id: 3, responsible_name: '王五', discovered_at: '2026-03-01', planned_finish: '2026-04-15', status: 'delayed', solution: '' },
  { id: 5, issue_no: 'P2026040005', dept_id: 1, dept_name: '营销中心', description: '样品交付进度慢，影响客户决策', category: 'collaboration', severity: 'medium', responsible_id: 2, responsible_name: '李四', discovered_at: '2026-04-02', planned_finish: '2026-04-08', status: 'resolved', solution: '已安排加急生产，本周内完成交付' }
])

const form = ref({
  dept_id: null,
  description: '',
  category: 'other',
  severity: 'medium',
  responsible_id: null,
  planned_finish: '',
  source: 'other',
  discovered_at: new Date().toISOString().slice(0, 10)
})

const handleForm = ref({
  status: 'in_progress',
  solution: '',
  actual_finish: ''
})

const rules = {
  dept_id: [{ required: true, message: '请选择所属中心', trigger: 'change' }],
  description: [{ required: true, message: '请描述问题', trigger: 'blur' }]
}

const stats = computed(() => ({
  pending: issues.value.filter(i => i.status === 'pending').length,
  inProgress: issues.value.filter(i => i.status === 'in_progress').length,
  resolved: issues.value.filter(i => i.status === 'resolved').length,
  high: issues.value.filter(i => i.severity === 'high' && i.status !== 'resolved').length
}))

const filteredIssues = computed(() => {
  let result = issues.value
  if (filterDept.value) result = result.filter(i => i.dept_id == filterDept.value)
  if (filterStatus.value) result = result.filter(i => i.status === filterStatus.value)
  if (filterSeverity.value) result = result.filter(i => i.severity === filterSeverity.value)
  return result
})

function getSeverityType(severity) {
  const map = { high: 'danger', medium: 'warning', low: 'info' }
  return map[severity] || 'info'
}

function getSeverityText(severity) {
  const map = { high: '高', medium: '中', low: '低' }
  return map[severity] || '中'
}

function getCategoryText(category) {
  const map = { quality: '质量', delivery: '交付', collaboration: '协作', other: '其他' }
  return map[category] || category
}

function getStatusType(status) {
  const map = { pending: 'danger', in_progress: 'warning', resolved: 'success', suspended: 'info' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { pending: '待处理', in_progress: '处理中', resolved: '已解决', suspended: '挂起' }
  return map[status] || status
}

function isOverdue(row) {
  return row.planned_finish && new Date(row.planned_finish) < new Date() && row.status !== 'resolved'
}

function showAddDialog() {
  form.value = {
    dept_id: null,
    description: '',
    category: 'other',
    severity: 'medium',
    responsible_id: null,
    planned_finish: '',
    source: 'other',
    discovered_at: new Date().toISOString().slice(0, 10)
  }
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    await axios.post('/api/issues', form.value)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    fetchIssues()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '创建失败')
  } finally {
    submitting.value = false
  }
}

function handleIssue(row) {
  selectedIssue.value = row
  handleForm.value = {
    status: row.status === 'pending' ? 'in_progress' : row.status,
    solution: row.solution || '',
    actual_finish: ''
  }
  handleDialogVisible.value = true
}

function viewDetail(row) {
  selectedIssue.value = row
  handleDialogVisible.value = true
}

async function saveHandle() {
  try {
    await axios.put(`/api/issues/${selectedIssue.value.id}`, handleForm.value)
    ElMessage.success('更新成功')
    
    const index = issues.value.findIndex(i => i.id === selectedIssue.value.id)
    if (index !== -1) {
      issues.value[index].status = handleForm.value.status
      issues.value[index].solution = handleForm.value.solution
    }
    
    handleDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '更新失败')
  }
}

async function fetchIssues() {
  try {
    const res = await axios.get('/api/issues')
    issues.value = res.data
  } catch (error) {
    console.error('获取问题失败:', error)
  }
}

onMounted(() => {
  fetchIssues()
})
</script>

<style scoped>
.issues-page {
  animation: fadeIn 0.5s;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 5px 0;
  font-size: 20px;
}

.header-left p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.header-right {
  display: flex;
  gap: 10px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-item {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-item.danger { border-top: 4px solid #F56C6C; }
.stat-item.warning { border-top: 4px solid #E6A23C; }
.stat-item.success { border-top: 4px solid #67C23A; }

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.issue-desc {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.overdue {
  color: #F56C6C;
  font-weight: bold;
}
</style>
