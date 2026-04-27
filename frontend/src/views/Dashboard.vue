<template>
  <div class="dashboard-page">
    <!-- 核心指标卡片 -->
    <div class="metrics-row">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="metric in metrics" :key="metric.key">
          <div class="metric-card" :class="metric.status">
            <div class="metric-icon">
              <el-icon :size="32"><component :is="metric.icon" /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-label">{{ metric.label }}</div>
              <div class="metric-value">{{ metric.value }}</div>
              <div class="metric-target">
                目标: {{ metric.target }}
                <span :class="metric.trendClass">
                  {{ metric.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(metric.trend) }}%
                </span>
              </div>
            </div>
            <div class="metric-status">
              <el-tag :type="metric.statusType" size="small">{{ metric.statusText }}</el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <!-- 预警与待办 -->
    <el-row :gutter="20" class="content-row">
      <el-col :xs="24" :lg="12">
        <el-card class="alert-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Warning /></el-icon> 预警提醒</span>
              <el-badge :value="alertCount" :max="99" class="badge" />
            </div>
          </template>
          
          <div class="alert-list">
            <div v-if="alerts.length === 0" class="empty-alert">
              <el-icon :size="48" color="#C0C4CC"><CircleCheck /></el-icon>
              <p>暂无预警，一切正常</p>
            </div>
            
            <div 
              v-for="alert in alerts" 
              :key="alert.id" 
              class="alert-item"
              :class="alert.level"
              @click="handleAlertClick(alert)"
            >
              <el-icon :size="20">
                <component :is="alert.level === 'red' ? 'CircleClose' : 'Warning'" />
              </el-icon>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-desc">{{ alert.description }}</div>
              </div>
              <div class="alert-time">{{ alert.time }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="todo-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><List /></el-icon> 今日待办</span>
              <el-tag type="info" size="small">{{ todos.length }} 项</el-tag>
            </div>
          </template>
          
          <div class="todo-list">
            <div v-if="todos.length === 0" class="empty-todo">
              <el-icon :size="48" color="#C0C4CC"><Calendar /></el-icon>
              <p>暂无待办事项</p>
            </div>
            
            <div 
              v-for="todo in todos" 
              :key="todo.id" 
              class="todo-item"
              @click="handleTodoClick(todo)"
            >
              <el-checkbox v-model="todo.completed" @change="handleTodoComplete(todo)" />
              <div class="todo-content" :class="{ completed: todo.completed }">
                <div class="todo-title">{{ todo.title }}</div>
                <div class="todo-meta">
                  <el-tag :type="todo.priority" size="small">{{ todo.priorityText }}</el-tag>
                  <span v-if="todo.deadline" class="deadline">截止: {{ todo.deadline }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 各中心数据 -->
    <el-card class="dept-card">
      <template #header>
        <div class="card-header">
          <span><el-icon="OfficeBuilding">各中心经营概况</span>
          <el-select v-model="selectedMonth" placeholder="选择月份" size="small" style="width: 120px">
            <el-option 
              v-for="month in months" 
              :key="month.value" 
              :label="month.label" 
              :value="month.value" 
            />
          </el-select>
        </div>
      </template>
      
      <el-table :data="deptData" style="width: 100%">
        <el-table-column prop="dept_name" label="中心" width="120" />
        <el-table-column label="目标达成率" width="200">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress 
                :percentage="row.avg_achievement_rate" 
                :color="getProgressColor(row.avg_achievement_rate)"
                :stroke-width="12"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="计划完成率" width="200">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress 
                :percentage="row.plan_completion_rate" 
                :color="getProgressColor(row.plan_completion_rate)"
                :stroke-width="12"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="open_issues" label="待处理问题" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.open_issues > 3 ? 'danger' : 'success'">
              {{ row.open_issues }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="high_severity_issues" label="高风险问题" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.high_severity_issues > 0 ? 'danger' : 'success'">
              {{ row.high_severity_issues }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="健康度" width="120" align="center">
          <template #default="{ row }">
            <div class="health-status">
              <span class="status-dot" :class="getHealthStatus(row)"></span>
              {{ getHealthText(row) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDeptDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 趋势图表 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span><el-icon><TrendCharts /></el-icon> 营收趋势（近6个月）</span>
          </template>
          <div ref="revenueChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span><el-icon><PieChart /></el-icon> 各中心目标达成对比</span>
          </template>
          <div ref="achievementChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const router = useRouter()

// 数据
const loading = ref(false)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

// 核心指标
const metrics = ref([
  {
    key: 'revenue',
    label: '本月营收',
    value: '380万',
    target: '400万',
    trend: -5,
    trendClass: 'down',
    status: 'red',
    statusType: 'danger',
    statusText: '需关注',
    icon: 'Money'
  },
  {
    key: 'delivery',
    label: '订单交付率',
    value: '96%',
    target: '98%',
    trend: -2,
    trendClass: 'down',
    status: 'yellow',
    statusType: 'warning',
    statusText: '待提升',
    icon: 'Box'
  },
  {
    key: 'quality',
    label: '出厂合格率',
    value: '98.5%',
    target: '99%',
    trend: -0.5,
    trendClass: 'down',
    status: 'yellow',
    statusType: 'warning',
    statusText: '待提升',
    icon: 'CircleCheck'
  },
  {
    key: 'budget',
    label: '费用执行率',
    value: '92%',
    target: '100%',
    trend: -8,
    trendClass: 'down',
    status: 'green',
    statusType: 'success',
    statusText: '正常',
    icon: 'Wallet'
  }
])

// 预警信息
const alerts = ref([
  {
    id: 1,
    level: 'red',
    title: '营销中心回款达成率仅75%',
    description: '距目标差距95万元，需重点关注',
    time: '2小时前'
  },
  {
    id: 2,
    level: 'red',
    title: '产品中心合格率连续2周下降',
    description: '本周合格率98.2%，较上周下降0.5%',
    time: '昨天'
  },
  {
    id: 3,
    level: 'yellow',
    title: '运营中心采购专员岗位空缺超30天',
    description: '影响采购效率，建议加快招聘进度',
    time: '3天前'
  }
])

// 待办事项
const todos = ref([
  { id: 1, title: '审批月度计划 - 营销中心', priority: 'danger', priorityText: '紧急', deadline: '今天', completed: false },
  { id: 2, title: '参加周例会（周一9:00）', priority: 'warning', priorityText: '重要', deadline: '周一', completed: false },
  { id: 3, title: '提交本周周报', priority: 'info', priorityText: '一般', deadline: '周五', completed: false },
  { id: 4, title: '处理采购延期问题', priority: 'danger', priorityText: '紧急', deadline: '今天', completed: false }
])

// 各中心数据
const deptData = ref([
  { dept_id: 1, dept_name: '营销中心', avg_achievement_rate: 85, plan_completion_rate: 90, open_issues: 3, high_severity_issues: 1 },
  { dept_id: 2, dept_name: '产品中心', avg_achievement_rate: 92, plan_completion_rate: 88, open_issues: 5, high_severity_issues: 2 },
  { dept_id: 3, dept_name: '运营中心', avg_achievement_rate: 95, plan_completion_rate: 92, open_issues: 2, high_severity_issues: 0 }
])

// 月份选项
const months = computed(() => {
  const result = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
      value: date.toISOString().slice(0, 7)
    })
  }
  return result
})

// 预警数量
const alertCount = computed(() => alerts.value.filter(a => a.level === 'red').length)

// 图表引用
const revenueChart = ref(null)
const achievementChart = ref(null)

// 获取仪表盘数据
async function fetchDashboard() {
  loading.value = true
  try {
    const res = await axios.get('/api/dashboard', {
      params: { year_month: selectedMonth.value }
    })
    // 更新数据
    // metrics.value = res.data.metrics
    // deptData.value = res.data.departments
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 初始化图表
function initCharts() {
  // 营收趋势图
  const revenueChartInstance = echarts.init(revenueChart.value)
  revenueChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['11月', '12月', '1月', '2月', '3月', '4月']
    },
    yAxis: { type: 'value', name: '万元' },
    series: [{
      name: '营收',
      type: 'line',
      smooth: true,
      data: [320, 380, 350, 400, 420, 380],
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ])
      },
      lineStyle: { color: '#409EFF', width: 3 },
      itemStyle: { color: '#409EFF' }
    }]
  })
  
  // 目标达成对比图
  const achievementChartInstance = echarts.init(achievementChart.value)
  achievementChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['达成率', '目标'] },
    xAxis: {
      type: 'category',
      data: ['营销中心', '产品中心', '运营中心']
    },
    yAxis: { type: 'value', name: '%', max: 120 },
    series: [
      {
        name: '达成率',
        type: 'bar',
        data: [85, 92, 95],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67C23A' },
            { offset: 1, color: '#95d475' }
          ])
        }
      },
      {
        name: '目标',
        type: 'line',
        data: [100, 100, 100],
        lineStyle: { color: '#F56C6C', type: 'dashed' },
        itemStyle: { color: '#F56C6C' }
      }
    ]
  })
  
  // 响应式
  window.addEventListener('resize', () => {
    revenueChartInstance.resize()
    achievementChartInstance.resize()
  })
}

// 获取进度条颜色
function getProgressColor(percentage) {
  if (percentage >= 95) return '#67C23A'
  if (percentage >= 85) return '#E6A23C'
  return '#F56C6C'
}

// 获取健康状态
function getHealthStatus(row) {
  if (row.avg_achievement_rate >= 95 && row.high_severity_issues === 0) return 'green'
  if (row.avg_achievement_rate >= 85 && row.high_severity_issues <= 1) return 'yellow'
  return 'red'
}

function getHealthText(row) {
  const status = getHealthStatus(row)
  const map = { green: '优秀', yellow: '良好', red: '需改进' }
  return map[status]
}

// 点击预警
function handleAlertClick(alert) {
  router.push('/issues')
}

// 点击待办
function handleTodoClick(todo) {
  if (todo.title.includes('审批')) {
    router.push('/plans')
  } else if (todo.title.includes('周报')) {
    router.push('/reports')
  }
}

// 完成待办
function handleTodoComplete(todo) {
  ElMessage.success(todo.completed ? '已完成' : '已取消完成')
}

// 查看部门详情
function viewDeptDetail(row) {
  router.push({
    path: '/analysis',
    query: { dept_id: row.dept_id }
  })
}

onMounted(async () => {
  await fetchDashboard()
  await nextTick()
  initCharts()
})
</script>

<style scoped>
.dashboard-page {
  animation: fadeIn 0.5s;
}

/* 指标卡片 */
.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.metric-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
}

.metric-card.red::before { background: #F56C6C; }
.metric-card.yellow::before { background: #E6A23C; }
.metric-card.green::before { background: #67C23A; }

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.metric-card.red .metric-icon { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.metric-card.yellow .metric-icon { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.metric-card.green .metric-icon { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.metric-target {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.metric-target .up { color: #67C23A; margin-left: 10px; }
.metric-target .down { color: #F56C6C; margin-left: 10px; }

/* 卡片样式 */
.content-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.card-header .el-icon {
  margin-right: 8px;
  vertical-align: middle;
}

/* 预警列表 */
.alert-list, .todo-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-alert, .empty-todo {
  text-align: center;
  padding: 40px 0;
  color: #C0C4CC;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.alert-item:hover {
  background: #f5f7fa;
  transform: translateX(5px);
}

.alert-item.red { border-left: 3px solid #F56C6C; }
.alert-item.yellow { border-left: 3px solid #E6A23C; }

.alert-item .el-icon { margin-right: 10px; }
.alert-item.red .el-icon { color: #F56C6C; }
.alert-item.yellow .el-icon { color: #E6A23C; }

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.alert-desc {
  font-size: 12px;
  color: #909399;
}

.alert-time {
  font-size: 12px;
  color: #C0C4CC;
}

/* 待办列表 */
.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #EBEEF5;
  cursor: pointer;
  transition: background 0.3s;
}

.todo-item:hover {
  background: #f5f7fa;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-content {
  flex: 1;
  margin-left: 10px;
}

.todo-content.completed .todo-title {
  text-decoration: line-through;
  color: #C0C4CC;
}

.todo-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 5px;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.deadline {
  font-size: 12px;
  color: #909399;
}

/* 表格 */
.dept-card {
  margin-bottom: 20px;
}

.progress-cell {
  padding-right: 20px;
}

.health-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

/* 图表 */
.chart-row {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .metric-card {
    margin-bottom: 10px;
  }
}
</style>
