<template>
  <div class="goals-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>年度目标管理</h2>
        <p>设定和跟踪各中心年度经营目标</p>
      </div>
      <div class="header-right">
        <el-select v-model="selectedYear" placeholder="选择年度" style="width: 120px">
          <el-option v-for="year in years" :key="year" :label="`${year}年`" :value="year" />
        </el-select>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 新增目标
        </el-button>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalGoals }}</div>
          <div class="stat-label">年度目标总数</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card green">
          <div class="stat-value">{{ stats.avgAchievement }}%</div>
          <div class="stat-label">平均达成率</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card orange">
          <div class="stat-value">{{ stats.atRisk }}</div>
          <div class="stat-label">风险目标数</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 目标列表 -->
    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="全部目标" name="all" />
        <el-tab-pane label="营销中心" name="1" />
        <el-tab-pane label="产品中心" name="2" />
        <el-tab-pane label="运营中心" name="3" />
      </el-tabs>
      
      <el-table :data="filteredGoals" style="width: 100%">
        <el-table-column prop="indicator_name" label="指标名称" min-width="150" />
        <el-table-column prop="dept_name" label="所属中心" width="120" />
        <el-table-column prop="target_value" label="目标值" width="120" align="right">
          <template #default="{ row }">
            {{ formatValue(row.target_value) }}
          </template>
        </el-table-column>
        <el-table-column prop="actual_value" label="实际值" width="120" align="right">
          <template #default="{ row }">
            {{ row.actual_value ? formatValue(row.actual_value) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="达成率" width="180">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress 
                :percentage="row.achievement_rate || 0"
                :color="getProgressColor(row.achievement_rate)"
                :stroke-width="16"
              >
                <span>{{ (row.achievement_rate || 0).toFixed(1) }}%</span>
              </el-progress>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="权重" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.weight }}%</el-tag>
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
            <el-button type="primary" link @click="editGoal(row)">编辑</el-button>
            <el-button type="primary" link @click="viewProgress(row)">进度</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑目标' : '新增目标'"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="所属中心" prop="dept_id">
          <el-select v-model="form.dept_id" placeholder="请选择中心" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="指标名称" prop="indicator_name">
          <el-input v-model="form.indicator_name" placeholder="请输入指标名称" />
        </el-form-item>
        
        <el-form-item label="目标值" prop="target_value">
          <el-input-number v-model="form.target_value" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="权重" prop="weight">
          <el-slider v-model="form.weight" :max="100" :step="5" show-input />
        </el-form-item>
        
        <el-divider content-position="left">季度目标分解</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Q1目标">
              <el-input-number v-model="form.q1_target" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Q2目标">
              <el-input-number v-model="form.q2_target" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Q3目标">
              <el-input-number v-model="form.q3_target" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Q4目标">
              <el-input-number v-model="form.q4_target" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 进度详情对话框 -->
    <el-dialog v-model="progressVisible" title="目标进度详情" width="700px">
      <div v-if="selectedGoal" class="progress-detail">
        <div class="goal-info">
          <h3>{{ selectedGoal.indicator_name }}</h3>
          <el-tag :type="getStatusType(selectedGoal.status)">
            {{ getStatusText(selectedGoal.status) }}
          </el-tag>
        </div>
        
        <div class="progress-chart" ref="progressChartRef" style="height: 300px;"></div>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="年度目标">{{ formatValue(selectedGoal.target_value) }}</el-descriptions-item>
          <el-descriptions-item label="当前实际">{{ formatValue(selectedGoal.actual_value) }}</el-descriptions-item>
          <el-descriptions-item label="达成率">{{ (selectedGoal.achievement_rate || 0).toFixed(2) }}%</el-descriptions-item>
          <el-descriptions-item label="剩余目标">{{ formatValue(selectedGoal.target_value - (selectedGoal.actual_value || 0)) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

// 数据
const selectedYear = ref(new Date().getFullYear())
const activeTab = ref('all')
const dialogVisible = ref(false)
const progressVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const progressChartRef = ref()

const goals = ref([
  { id: 1, year: 2026, dept_id: 1, dept_name: '营销中心', indicator_name: '年度营收目标', target_value: 5000, actual_value: 3800, weight: 30, achievement_rate: 76, status: 'executing' },
  { id: 2, year: 2026, dept_id: 1, dept_name: '营销中心', indicator_name: '回款达成率', target_value: 95, actual_value: 88, weight: 20, achievement_rate: 92.6, status: 'executing' },
  { id: 3, year: 2026, dept_id: 2, dept_name: '产品中心', indicator_name: '订单交付率', target_value: 98, actual_value: 96, weight: 25, achievement_rate: 98, status: 'executing' },
  { id: 4, year: 2026, dept_id: 2, dept_name: '产品中心', indicator_name: '出厂合格率', target_value: 99, actual_value: 98.5, weight: 25, achievement_rate: 99.5, status: 'executing' },
  { id: 5, year: 2026, dept_id: 3, dept_name: '运营中心', indicator_name: '人才到岗率', target_value: 95, actual_value: 90, weight: 20, achievement_rate: 94.7, status: 'executing' },
  { id: 6, year: 2026, dept_id: 3, dept_name: '运营中心', indicator_name: '费用执行率', target_value: 100, actual_value: 92, weight: 20, achievement_rate: 92, status: 'executing' }
])

const selectedGoal = ref(null)

const form = ref({
  dept_id: null,
  indicator_name: '',
  target_value: 0,
  weight: 10,
  q1_target: null,
  q2_target: null,
  q3_target: null,
  q4_target: null
})

const rules = {
  dept_id: [{ required: true, message: '请选择所属中心', trigger: 'change' }],
  indicator_name: [{ required: true, message: '请输入指标名称', trigger: 'blur' }],
  target_value: [{ required: true, message: '请输入目标值', trigger: 'blur' }]
}

// 计算属性
const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
})

const filteredGoals = computed(() => {
  let result = goals.value.filter(g => g.year === selectedYear.value)
  if (activeTab.value !== 'all') {
    result = result.filter(g => g.dept_id === parseInt(activeTab.value))
  }
  return result
})

const stats = computed(() => {
  const total = filteredGoals.value.length
  const avg = filteredGoals.value.reduce((sum, g) => sum + (g.achievement_rate || 0), 0) / total || 0
  const atRisk = filteredGoals.value.filter(g => (g.achievement_rate || 0) < 85).length
  
  return {
    totalGoals: total,
    avgAchievement: avg.toFixed(1),
    atRisk
  }
})

// 方法
function formatValue(value) {
  if (value === null || value === undefined) return '-'
  if (value >= 10000) return (value / 10000).toFixed(2) + '万'
  return value.toLocaleString()
}

function getProgressColor(percentage) {
  if (percentage >= 95) return '#67C23A'
  if (percentage >= 85) return '#E6A23C'
  return '#F56C6C'
}

function getStatusType(status) {
  const map = {
    draft: 'info',
    signed: 'success',
    executing: 'primary',
    completed: 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    draft: '草稿',
    signed: '已签订',
    executing: '执行中',
    completed: '已完成'
  }
  return map[status] || status
}

function showAddDialog() {
  isEdit.value = false
  form.value = {
    dept_id: null,
    indicator_name: '',
    target_value: 0,
    weight: 10,
    q1_target: null,
    q2_target: null,
    q3_target: null,
    q4_target: null
  }
  dialogVisible.value = true
}

function editGoal(goal) {
  isEdit.value = true
  form.value = { ...goal }
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    if (isEdit.value) {
      await axios.put(`/api/goals/${form.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      await axios.post('/api/goals', { ...form.value, year: selectedYear.value })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchGoals()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function viewProgress(goal) {
  selectedGoal.value = goal
  progressVisible.value = true
  await nextTick()
  initProgressChart()
}

function initProgressChart() {
  if (!progressChartRef.value || !selectedGoal.value) return
  
  const chart = echarts.init(progressChartRef.value)
  const goal = selectedGoal.value
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Q1', 'Q2', 'Q3', 'Q4']
    },
    yAxis: [
      { type: 'value', name: '完成值' },
      { type: 'value', name: '达成率(%)', max: 150 }
    ],
    series: [
      {
        name: '目标',
        type: 'bar',
        data: [goal.q1_target, goal.q2_target, goal.q3_target, goal.q4_target],
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '实际',
        type: 'bar',
        data: [goal.q1_actual, goal.q2_actual, goal.q3_actual, goal.q4_actual],
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '达成率',
        type: 'line',
        yAxisIndex: 1,
        data: [85, 92, 88, 95],
        lineStyle: { color: '#E6A23C', width: 3 },
        itemStyle: { color: '#E6A23C' }
      }
    ]
  })
}

async function fetchGoals() {
  try {
    const res = await axios.get('/api/goals', { params: { year: selectedYear.value } })
    goals.value = res.data
  } catch (error) {
    console.error('获取目标失败:', error)
  }
}

onMounted(() => {
  fetchGoals()
})
</script>

<style scoped>
.goals-page {
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

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  color: #fff;
}

.stat-card.green {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.stat-card.orange {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.progress-cell {
  padding-right: 20px;
}

.progress-detail .goal-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.progress-detail h3 {
  margin: 0;
  font-size: 18px;
}

.progress-chart {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .stat-card {
    margin-bottom: 10px;
  }
}
</style>
