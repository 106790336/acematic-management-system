<template>
  <div class="plans-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>月度经营计划</h2>
        <p>制定和跟踪各中心月度经营计划</p>
      </div>
      <div class="header-right">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY年MM月"
          value-format="YYYY-MM"
          style="width: 150px"
        />
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 提交计划
        </el-button>
      </div>
    </div>
    
    <!-- 计划统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-item">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">计划总数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item success">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item warning">
          <div class="stat-value">{{ stats.inProgress }}</div>
          <div class="stat-label">进行中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-item danger">
          <div class="stat-value">{{ stats.delayed }}</div>
          <div class="stat-label">已延期</div>
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
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        
        <el-select v-model="filterExecution" placeholder="按执行状态" clearable style="width: 150px">
          <el-option label="未开始" value="not_started" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已延期" value="delayed" />
        </el-select>
      </div>
      
      <el-table :data="filteredPlans" style="width: 100%">
        <el-table-column prop="plan_item" label="计划事项" min-width="200">
          <template #default="{ row }">
            <div class="plan-title">
              <el-tag :type="getPriorityType(row.priority)" size="small">
                {{ getPriorityText(row.priority) }}
              </el-tag>
              {{ row.plan_item }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dept_name" label="中心" width="100" />
        <el-table-column prop="target_value" label="目标值" width="120" />
        <el-table-column label="执行进度" width="180">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.completion_rate"
              :color="getProgressColor(row.execution_status)"
              :stroke-width="14"
            />
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row) }">{{ row.deadline }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="approval_status" label="审核状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getApprovalType(row.approval_status)">
              {{ getApprovalText(row.approval_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="execution_status" label="执行状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getExecutionType(row.execution_status)">
              {{ getExecutionText(row.execution_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.approval_status === 'pending'" 
              type="primary" 
              link 
              @click="approvePlan(row, 'approved')"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.approval_status === 'pending'" 
              type="danger" 
              link 
              @click="approvePlan(row, 'rejected')"
            >
              驳回
            </el-button>
            <el-button type="primary" link @click="editPlan(row)">编辑</el-button>
            <el-button type="primary" link @click="updateProgress(row)">更新进度</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增计划对话框 -->
    <el-dialog v-model="dialogVisible" title="提交月度计划" width="650px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="所属中心" prop="dept_id">
          <el-select v-model="form.dept_id" placeholder="请选择中心" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="计划事项" prop="plan_item">
          <el-input 
            v-model="form.plan_item" 
            type="textarea" 
            :rows="3"
            placeholder="请详细描述计划事项"
          />
        </el-form-item>
        
        <el-form-item label="目标值" prop="target_value">
          <el-input v-model="form.target_value" placeholder="请输入可量化的目标值" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="责任人">
              <el-select v-model="form.responsible_id" placeholder="请选择" style="width: 100%">
                <el-option label="张三" :value="1" />
                <el-option label="李四" :value="2" />
                <el-option label="王五" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" style="width: 100%">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预算">
              <el-input-number v-model="form.budget" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="完成时限">
              <el-date-picker 
                v-model="form.deadline" 
                type="date" 
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
    
    <!-- 更新进度对话框 -->
    <el-dialog v-model="progressDialogVisible" title="更新执行进度" width="500px">
      <el-form :model="progressForm" label-width="100px">
        <el-form-item label="执行状态">
          <el-select v-model="progressForm.execution_status" style="width: 100%">
            <el-option label="未开始" value="not_started" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已延期" value="delayed" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="完成进度">
          <el-slider v-model="progressForm.completion_rate" :min="0" :max="100" show-input />
        </el-form-item>
        
        <el-form-item label="完成说明">
          <el-input 
            v-model="progressForm.actual_result" 
            type="textarea" 
            :rows="3"
            placeholder="请说明实际完成情况"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="progressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProgress">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const dialogVisible = ref(false)
const progressDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()

const filterDept = ref('')
const filterStatus = ref('')
const filterExecution = ref('')

const plans = ref([
  { id: 1, year_month: '2026-04', dept_id: 1, dept_name: '营销中心', plan_item: '完成新客户开发20家', target_value: '20家', responsible_id: 1, deadline: '2026-04-30', priority: 'high', approval_status: 'approved', execution_status: 'in_progress', completion_rate: 60 },
  { id: 2, year_month: '2026-04', dept_id: 1, dept_name: '营销中心', plan_item: '销售额达到400万元', target_value: '400万', responsible_id: 1, deadline: '2026-04-30', priority: 'high', approval_status: 'approved', execution_status: 'in_progress', completion_rate: 75 },
  { id: 3, year_month: '2026-04', dept_id: 2, dept_name: '产品中心', plan_item: '完成订单交付500件', target_value: '500件', responsible_id: 2, deadline: '2026-04-25', priority: 'high', approval_status: 'approved', execution_status: 'in_progress', completion_rate: 80 },
  { id: 4, year_month: '2026-04', dept_id: 2, dept_name: '产品中心', plan_item: '出厂合格率达到99%', target_value: '99%', responsible_id: 2, deadline: '2026-04-30', priority: 'high', approval_status: 'approved', execution_status: 'in_progress', completion_rate: 85 },
  { id: 5, year_month: '2026-04', dept_id: 3, dept_name: '运营中心', plan_item: '完成招聘采购专员1名', target_value: '1人', responsible_id: 3, deadline: '2026-04-15', priority: 'medium', approval_status: 'approved', execution_status: 'delayed', completion_rate: 30 },
  { id: 6, year_month: '2026-04', dept_id: 3, dept_name: '运营中心', plan_item: '费用控制在预算范围内', target_value: '100%', responsible_id: 3, deadline: '2026-04-30', priority: 'medium', approval_status: 'pending', execution_status: 'not_started', completion_rate: 0 }
])

const form = ref({
  dept_id: null,
  plan_item: '',
  target_value: '',
  responsible_id: null,
  budget: 0,
  deadline: '',
  priority: 'medium'
})

const progressForm = ref({
  id: null,
  execution_status: 'in_progress',
  completion_rate: 0,
  actual_result: ''
})

const rules = {
  dept_id: [{ required: true, message: '请选择所属中心', trigger: 'change' }],
  plan_item: [{ required: true, message: '请输入计划事项', trigger: 'blur' }],
  target_value: [{ required: true, message: '请输入目标值', trigger: 'blur' }]
}

const stats = computed(() => ({
  total: plans.value.length,
  completed: plans.value.filter(p => p.execution_status === 'completed').length,
  inProgress: plans.value.filter(p => p.execution_status === 'in_progress').length,
  delayed: plans.value.filter(p => p.execution_status === 'delayed').length
}))

const filteredPlans = computed(() => {
  let result = plans.value.filter(p => p.year_month === selectedMonth.value)
  if (filterDept.value) result = result.filter(p => p.dept_id == filterDept.value)
  if (filterStatus.value) result = result.filter(p => p.approval_status === filterStatus.value)
  if (filterExecution.value) result = result.filter(p => p.execution_status === filterExecution.value)
  return result
})

function getPriorityType(priority) {
  const map = { high: 'danger', medium: 'warning', low: 'info' }
  return map[priority] || 'info'
}

function getPriorityText(priority) {
  const map = { high: '高', medium: '中', low: '低' }
  return map[priority] || '中'
}

function getProgressColor(status) {
  const map = { completed: '#67C23A', in_progress: '#409EFF', delayed: '#F56C6C', not_started: '#C0C4CC' }
  return map[status] || '#C0C4CC'
}

function getApprovalType(status) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

function getApprovalText(status) {
  const map = { pending: '待审核', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

function getExecutionType(status) {
  const map = { not_started: 'info', in_progress: 'primary', completed: 'success', delayed: 'danger' }
  return map[status] || 'info'
}

function getExecutionText(status) {
  const map = { not_started: '未开始', in_progress: '进行中', completed: '已完成', delayed: '已延期' }
  return map[status] || status
}

function isOverdue(row) {
  return row.deadline && new Date(row.deadline) < new Date() && row.execution_status !== 'completed'
}

function showAddDialog() {
  form.value = {
    dept_id: null,
    plan_item: '',
    target_value: '',
    responsible_id: null,
    budget: 0,
    deadline: '',
    priority: 'medium'
  }
  dialogVisible.value = true
}

function editPlan(row) {
  form.value = { ...row }
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    await axios.post('/api/plans', { ...form.value, year_month: selectedMonth.value })
    ElMessage.success('提交成功')
    dialogVisible.value = false
    fetchPlans()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function approvePlan(row, status) {
  const action = status === 'approved' ? '通过' : '驳回'
  
  if (status === 'rejected') {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回计划', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '请输入驳回原因'
    }).catch(() => ({ value: null }))
    
    if (!value) return
    
    row.approval_comment = value
  }
  
  try {
    await axios.put(`/api/plans/${row.id}/approve`, { 
      approval_status: status,
      approval_comment: row.approval_comment
    })
    ElMessage.success(`已${action}`)
    row.approval_status = status
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  }
}

function updateProgress(row) {
  progressForm.value = {
    id: row.id,
    execution_status: row.execution_status,
    completion_rate: row.completion_rate,
    actual_result: ''
  }
  progressDialogVisible.value = true
}

async function saveProgress() {
  try {
    await axios.put(`/api/plans/${progressForm.value.id}`, progressForm.value)
    ElMessage.success('更新成功')
    
    const index = plans.value.findIndex(p => p.id === progressForm.value.id)
    if (index !== -1) {
      plans.value[index].execution_status = progressForm.value.execution_status
      plans.value[index].completion_rate = progressForm.value.completion_rate
    }
    
    progressDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '更新失败')
  }
}

async function fetchPlans() {
  try {
    const res = await axios.get('/api/plans', { params: { year_month: selectedMonth.value } })
    plans.value = res.data
  } catch (error) {
    console.error('获取计划失败:', error)
  }
}

onMounted(() => {
  fetchPlans()
})
</script>

<style scoped>
.plans-page {
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

.stat-item.success { border-top: 4px solid #67C23A; }
.stat-item.warning { border-top: 4px solid #E6A23C; }
.stat-item.danger { border-top: 4px solid #F56C6C; }

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

.plan-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overdue {
  color: #F56C6C;
  font-weight: bold;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .filter-bar {
    flex-wrap: wrap;
  }
}
</style>
