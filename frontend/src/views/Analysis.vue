<template>
  <div class="analysis-page">
    <div class="page-header">
      <div class="header-left">
        <h2>月度经营分析</h2>
        <p>数据汇总与偏差分析</p>
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
        <el-button type="primary" @click="generateReport">
          <el-icon><Document /></el-icon> 生成报告
        </el-button>
      </div>
    </div>
    
    <!-- 数据录入 -->
    <el-card class="input-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Edit /></el-icon> 经营数据录入</span>
          <el-button type="primary" size="small" @click="showInputDialog">
            <el-icon><Plus /></el-icon> 录入数据
          </el-button>
        </div>
      </template>
      
      <el-table :data="monthlyData" style="width: 100%">
        <el-table-column prop="dept_name" label="中心" width="100" />
        <el-table-column prop="indicator_name" label="指标" width="150" />
        <el-table-column prop="monthly_target" label="目标值" width="120" align="right" />
        <el-table-column prop="monthly_actual" label="实际值" width="120" align="right" />
        <el-table-column label="达成率" width="150">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.achievement_rate"
              :color="getProgressColor(row.achievement_rate)"
              :stroke-width="14"
            />
          </template>
        </el-table-column>
        <el-table-column prop="yoy_growth" label="同比" width="100" align="center">
          <template #default="{ row }">
            <span :class="{ up: row.yoy_growth > 0, down: row.yoy_growth < 0 }">
              {{ row.yoy_growth > 0 ? '+' : '' }}{{ row.yoy_growth }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="mom_growth" label="环比" width="100" align="center">
          <template #default="{ row }">
            <span :class="{ up: row.mom_growth > 0, down: row.mom_growth < 0 }">
              {{ row.mom_growth > 0 ? '+' : '' }}{{ row.mom_growth }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="analyzeDeviation(row)">偏差分析</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 分析报告 -->
    <el-card v-if="report" class="report-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Document /></el-icon> {{ selectedMonth }} 月度经营分析报告</span>
          <div>
            <el-button type="primary" size="small" @click="exportReport">
              <el-icon><Download /></el-icon> 导出
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="report-content" v-html="report"></div>
    </el-card>
    
    <!-- 图表分析 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>各中心达成率对比</span>
          </template>
          <div ref="achievementChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>趋势分析</span>
          </template>
          <div ref="trendChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 录入数据对话框 -->
    <el-dialog v-model="inputDialogVisible" title="录入经营数据" width="600px">
      <el-form :model="inputForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="所属中心" prop="dept_id">
          <el-select v-model="inputForm.dept_id" placeholder="请选择中心" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="指标名称" prop="indicator_name">
          <el-input v-model="inputForm.indicator_name" placeholder="请输入指标名称" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="本月目标">
              <el-input-number v-model="inputForm.monthly_target" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="本月实际">
              <el-input-number v-model="inputForm.monthly_actual" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="去年同期">
              <el-input-number v-model="inputForm.last_year_actual" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上月实际">
              <el-input-number v-model="inputForm.last_month_actual" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="偏差原因">
          <el-input v-model="inputForm.deviation_reason" type="textarea" :rows="2" placeholder="达成率异常请填写原因" />
        </el-form-item>
        
        <el-form-item label="改进措施">
          <el-input v-model="inputForm.improvement_measure" type="textarea" :rows="2" placeholder="请填写改进措施" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="inputDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitData">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 偏差分析对话框 -->
    <el-dialog v-model="deviationDialogVisible" title="偏差分析" width="700px">
      <div v-if="selectedData" class="deviation-analysis">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="指标">{{ selectedData.indicator_name }}</el-descriptions-item>
          <el-descriptions-item label="中心">{{ selectedData.dept_name }}</el-descriptions-item>
          <el-descriptions-item label="目标值">{{ selectedData.monthly_target }}</el-descriptions-item>
          <el-descriptions-item label="实际值">{{ selectedData.monthly_actual }}</el-descriptions-item>
          <el-descriptions-item label="达成率">
            <el-tag :type="selectedData.achievement_rate >= 95 ? 'success' : selectedData.achievement_rate >= 85 ? 'warning' : 'danger'">
              {{ selectedData.achievement_rate }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="偏差">{{ (selectedData.monthly_actual - selectedData.monthly_target).toFixed(2) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="analysis-section">
          <h4>5Why分析</h4>
          <div class="why-analysis">
            <p><strong>为什么1：</strong>达成率偏低的主要原因是什么？</p>
            <p>{{ selectedData.deviation_reason || '暂未填写' }}</p>
            
            <p><strong>为什么2：</strong>为什么会出现这个原因？</p>
            <p>{{ aiAnalysis?.why2 || '待分析' }}</p>
            
            <p><strong>为什么3：</strong>根本原因是什么？</p>
            <p>{{ aiAnalysis?.why3 || '待分析' }}</p>
          </div>
        </div>
        
        <div class="analysis-section">
          <h4>改进建议</h4>
          <p>{{ selectedData.improvement_measure || aiAnalysis?.improvement || '暂无' }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const inputDialogVisible = ref(false)
const deviationDialogVisible = ref(false)
const formRef = ref()
const report = ref('')
const selectedData = ref(null)
const aiAnalysis = ref(null)

const achievementChart = ref(null)
const trendChart = ref(null)

const monthlyData = ref([
  { id: 1, year_month: '2026-04', dept_id: 1, dept_name: '营销中心', indicator_name: '销售额', monthly_target: 400, monthly_actual: 380, achievement_rate: 95, yoy_growth: 12, mom_growth: -5, deviation_reason: '', improvement_measure: '' },
  { id: 2, year_month: '2026-04', dept_id: 1, dept_name: '营销中心', indicator_name: '回款达成率', monthly_target: 95, monthly_actual: 88, achievement_rate: 92.6, yoy_growth: 5, mom_growth: -3, deviation_reason: '', improvement_measure: '' },
  { id: 3, year_month: '2026-04', dept_id: 2, dept_name: '产品中心', indicator_name: '订单交付率', monthly_target: 98, monthly_actual: 96, achievement_rate: 98, yoy_growth: 2, mom_growth: 1, deviation_reason: '', improvement_measure: '' },
  { id: 4, year_month: '2026-04', dept_id: 2, dept_name: '产品中心', indicator_name: '出厂合格率', monthly_target: 99, monthly_actual: 98.5, achievement_rate: 99.5, yoy_growth: 1, mom_growth: -0.5, deviation_reason: '', improvement_measure: '' },
  { id: 5, year_month: '2026-04', dept_id: 3, dept_name: '运营中心', indicator_name: '人才到岗率', monthly_target: 95, monthly_actual: 90, achievement_rate: 94.7, yoy_growth: 3, mom_growth: 0, deviation_reason: '', improvement_measure: '' },
  { id: 6, year_month: '2026-04', dept_id: 3, dept_name: '运营中心', indicator_name: '费用执行率', monthly_target: 100, monthly_actual: 92, achievement_rate: 92, yoy_growth: -2, mom_growth: 3, deviation_reason: '', improvement_measure: '' }
])

const inputForm = ref({
  dept_id: null,
  indicator_name: '',
  monthly_target: 0,
  monthly_actual: 0,
  last_year_actual: 0,
  last_month_actual: 0,
  deviation_reason: '',
  improvement_measure: ''
})

const rules = {
  dept_id: [{ required: true, message: '请选择中心', trigger: 'change' }],
  indicator_name: [{ required: true, message: '请输入指标名称', trigger: 'blur' }]
}

function getProgressColor(percentage) {
  if (percentage >= 95) return '#67C23A'
  if (percentage >= 85) return '#E6A23C'
  return '#F56C6C'
}

function showInputDialog() {
  inputForm.value = {
    dept_id: null,
    indicator_name: '',
    monthly_target: 0,
    monthly_actual: 0,
    last_year_actual: 0,
    last_month_actual: 0,
    deviation_reason: '',
    improvement_measure: ''
  }
  inputDialogVisible.value = true
}

async function submitData() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  try {
    await axios.post('/api/analysis/monthly', { ...inputForm.value, year_month: selectedMonth.value })
    ElMessage.success('保存成功')
    inputDialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '保存失败')
  }
}

function analyzeDeviation(row) {
  selectedData.value = row
  aiAnalysis.value = {
    why2: '客户付款周期延长，部分大客户资金紧张',
    why3: '市场环境变化，客户资金压力传导',
    improvement: '1. 加强客户信用管理，优化付款条件\n2. 建立预警机制，提前沟通\n3. 必要时启动法律催收'
  }
  deviationDialogVisible.value = true
}

function generateReport() {
  report.value = `
    <h3>一、经营概况</h3>
    <p>2026年4月，公司整体经营情况正常。各中心核心指标达成率平均为95.3%，同比提升5.2个百分点。</p>
    
    <h3>二、各中心分析</h3>
    
    <h4>2.1 营销中心</h4>
    <ul>
      <li>销售额：实际完成380万，达成率95%，同比增长12%</li>
      <li>回款达成率：88%，低于目标7个百分点，需重点关注</li>
      <li>主要问题：部分大客户付款周期延长，资金紧张</li>
    </ul>
    
    <h4>2.2 产品中心</h4>
    <ul>
      <li>订单交付率：96%，达成率98%，表现良好</li>
      <li>出厂合格率：98.5%，略低于目标，需加强质量管控</li>
      <li>主要问题：原材料供应商交期不稳定</li>
    </ul>
    
    <h4>2.3 运营中心</h4>
    <ul>
      <li>人才到岗率：90%，达成率94.7%</li>
      <li>费用执行率：92%，控制在预算范围内</li>
      <li>主要问题：采购专员岗位招聘延期</li>
    </ul>
    
    <h3>三、重点问题</h3>
    <ol>
      <li><strong>回款问题</strong>：营销中心回款达成率偏低，影响现金流，建议加强客户信用管理和催收力度</li>
      <li><strong>质量问题</strong>：产品中心合格率连续下降，需排查原因并采取改进措施</li>
      <li><strong>招聘问题</strong>：运营中心采购专员岗位空缺超30天，影响采购效率</li>
    </ol>
    
    <h3>四、下月建议</h3>
    <ol>
      <li>营销中心：加大回款催收力度，争取回款达成率提升至95%以上</li>
      <li>产品中心：优化生产工艺，提升合格率至99%以上</li>
      <li>运营中心：本周内完成采购专员招聘，恢复正常采购节奏</li>
    </ol>
  `
}

function exportReport() {
  ElMessage.success('报告导出功能开发中')
}

function initCharts() {
  // 达成率对比图
  const chart1 = echarts.init(achievementChart.value)
  chart1.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['销售额', '回款率', '交付率', '合格率', '到岗率', '费用率']
    },
    yAxis: { type: 'value', name: '%', max: 120 },
    series: [{
      name: '达成率',
      type: 'bar',
      data: [95, 92.6, 98, 99.5, 94.7, 92],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      }
    }, {
      name: '目标',
      type: 'line',
      data: [100, 100, 100, 100, 100, 100],
      lineStyle: { color: '#F56C6C', type: 'dashed' }
    }]
  })
  
  // 趋势分析图
  const chart2 = echarts.init(trendChart.value)
  chart2.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['营销中心', '产品中心', '运营中心'] },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月']
    },
    yAxis: { type: 'value', name: '达成率%' },
    series: [
      { name: '营销中心', type: 'line', data: [88, 92, 90, 95], smooth: true },
      { name: '产品中心', type: 'line', data: [95, 94, 96, 98], smooth: true },
      { name: '运营中心', type: 'line', data: [90, 92, 94, 93], smooth: true }
    ]
  })
}

async function fetchData() {
  try {
    const res = await axios.get('/api/analysis/monthly', { params: { year_month: selectedMonth.value } })
    monthlyData.value = res.data
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  initCharts()
})
</script>

<style scoped>
.analysis-page {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-card {
  margin-bottom: 20px;
}

.up { color: #67C23A; font-weight: bold; }
.down { color: #F56C6C; font-weight: bold; }

.report-card {
  margin-bottom: 20px;
}

.report-content {
  line-height: 1.8;
}

.report-content h3 {
  margin: 20px 0 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409EFF;
}

.report-content h3:first-child {
  margin-top: 0;
}

.report-content h4 {
  margin: 15px 0 10px;
  color: #606266;
}

.report-content ul, .report-content ol {
  margin-left: 20px;
}

.report-content li {
  margin: 5px 0;
}

.chart-row {
  margin-bottom: 20px;
}

.deviation-analysis .analysis-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.deviation-analysis h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #606266;
}

.why-analysis p {
  margin: 5px 0;
  font-size: 14px;
  line-height: 1.6;
}
</style>
