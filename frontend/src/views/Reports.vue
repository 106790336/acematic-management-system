<template>
  <div class="reports-page">
    <div class="page-header">
      <div class="header-left">
        <h2>周报管理</h2>
        <p>收集和分析各中心周报</p>
      </div>
      <div class="header-right">
        <el-date-picker
          v-model="selectedWeek"
          type="week"
          placeholder="选择周"
          format="YYYY年 第ww周"
          value-format="YYYY-MM-DD"
          style="width: 180px"
        />
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 提交周报
        </el-button>
      </div>
    </div>
    
    <!-- 周报汇总卡片 -->
    <el-card class="summary-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><DataAnalysis /></el-icon> 本周周报汇总</span>
          <el-button type="primary" link @click="generateSummary">
            <el-icon><MagicStick /></el-icon> AI生成摘要
          </el-button>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :xs="24" :md="8" v-for="dept in reports" :key="dept.dept_id">
          <div class="dept-report-card">
            <div class="dept-header">
              <h4>{{ dept.dept_name }}</h4>
              <el-tag :type="dept.submitted ? 'success' : 'info'" size="small">
                {{ dept.submitted ? '已提交' : '未提交' }}
              </el-tag>
            </div>
            
            <div v-if="dept.report" class="dept-content">
              <div class="section">
                <div class="section-title">本周完成</div>
                <div class="section-content">{{ dept.report.completed_items }}</div>
              </div>
              
              <div class="section">
                <div class="section-title">关键数据</div>
                <div class="key-data">
                  <el-tag v-for="(value, key) in dept.report.key_data" :key="key" class="data-tag">
                    {{ key }}: {{ value }}
                  </el-tag>
                </div>
              </div>
              
              <div v-if="dept.report.issues" class="section">
                <div class="section-title">需要协调</div>
                <div class="section-content issue">{{ dept.report.issues }}</div>
              </div>
            </div>
            
            <div v-else class="empty-report">
              <el-icon :size="32" color="#C0C4CC"><Document /></el-icon>
              <p>暂未提交周报</p>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- AI摘要 -->
    <el-card v-if="aiSummary" class="ai-summary-card">
      <template #header>
        <span><el-icon><MagicStick /></el-icon> AI智能摘要</span>
      </template>
      <div class="summary-content" v-html="aiSummary"></div>
    </el-card>
    
    <!-- 历史周报列表 -->
    <el-card>
      <template #header>
        <span><el-icon><List /></el-icon> 历史周报</span>
      </template>
      
      <el-table :data="historyReports" style="width: 100%">
        <el-table-column prop="week_date" label="周次" width="120" />
        <el-table-column prop="dept_name" label="中心" width="100" />
        <el-table-column prop="submitter_name" label="提交人" width="100" />
        <el-table-column prop="completed_items" label="本周完成" min-width="200">
          <template #default="{ row }">
            <div class="text-ellipsis">{{ row.completed_items }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="self_evaluation" label="自评" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getEvaluationType(row.self_evaluation)">
              {{ getEvaluationText(row.self_evaluation) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitted_at" label="提交时间" width="160" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewReport(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 提交周报对话框 -->
    <el-dialog v-model="dialogVisible" title="提交周报" width="700px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="所属中心" prop="dept_id">
          <el-select v-model="form.dept_id" placeholder="请选择中心" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="本周完成" prop="completed_items">
          <el-input 
            v-model="form.completed_items" 
            type="textarea" 
            :rows="4"
            placeholder="请详细描述本周完成的工作事项"
          />
        </el-form-item>
        
        <el-form-item label="关键数据">
          <div class="key-data-input">
            <div v-for="(item, index) in keyDataList" :key="index" class="data-item">
              <el-input v-model="item.key" placeholder="指标名称" style="width: 150px" />
              <el-input v-model="item.value" placeholder="数值" style="width: 150px" />
              <el-button type="danger" link @click="removeKeyData(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addKeyData">
              <el-icon><Plus /></el-icon> 添加数据
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="下周计划">
          <el-input 
            v-model="form.next_week_plans" 
            type="textarea" 
            :rows="3"
            placeholder="请描述下周重点工作计划"
          />
        </el-form-item>
        
        <el-form-item label="需要协调">
          <el-input 
            v-model="form.issues" 
            type="textarea" 
            :rows="2"
            placeholder="请描述需要其他中心或公司支持协调的事项"
          />
        </el-form-item>
        
        <el-form-item label="自我评价">
          <el-radio-group v-model="form.self_evaluation">
            <el-radio-button value="exceeded">超预期</el-radio-button>
            <el-radio-button value="met">达成</el-radio-button>
            <el-radio-button value="unmet">未达成</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
    
    <!-- 查看周报详情 -->
    <el-dialog v-model="detailVisible" title="周报详情" width="600px">
      <div v-if="selectedReport" class="report-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="中心">{{ selectedReport.dept_name }}</el-descriptions-item>
          <el-descriptions-item label="提交人">{{ selectedReport.submitter_name }}</el-descriptions-item>
          <el-descriptions-item label="周次">{{ selectedReport.week_date }}</el-descriptions-item>
          <el-descriptions-item label="自评">
            <el-tag :type="getEvaluationType(selectedReport.self_evaluation)">
              {{ getEvaluationText(selectedReport.self_evaluation) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>本周完成事项</h4>
          <p>{{ selectedReport.completed_items }}</p>
        </div>
        
        <div v-if="selectedReport.key_data" class="detail-section">
          <h4>关键数据</h4>
          <p>{{ selectedReport.key_data }}</p>
        </div>
        
        <div v-if="selectedReport.next_week_plans" class="detail-section">
          <h4>下周计划</h4>
          <p>{{ selectedReport.next_week_plans }}</p>
        </div>
        
        <div v-if="selectedReport.issues" class="detail-section">
          <h4>需要协调</h4>
          <p class="issue-text">{{ selectedReport.issues }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const selectedWeek = ref(new Date().toISOString().slice(0, 10))
const dialogVisible = ref(false)
const detailVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
const aiSummary = ref('')
const selectedReport = ref(null)

const reports = ref([
  { 
    dept_id: 1, 
    dept_name: '营销中心', 
    submitted: true,
    report: {
      completed_items: '完成客户拜访15家，签订合同3份；参与行业展会，收集潜在客户信息50条；完成月度销售分析报告。',
      key_data: { '销售额': '120万', '新客户': '8家', '合同': '3份' },
      issues: '需要产品中心加快样品交付进度，影响客户决策。'
    }
  },
  { 
    dept_id: 2, 
    dept_name: '产品中心', 
    submitted: true,
    report: {
      completed_items: '完成订单生产280件；优化生产工艺，提升效率5%；处理客户质量反馈3起。',
      key_data: { '产量': '280件', '合格率': '98.5%', '交付': '96%' },
      issues: '原材料供应商交期不稳定，影响生产排期。'
    }
  },
  { 
    dept_id: 3, 
    dept_name: '运营中心', 
    submitted: true,
    report: {
      completed_items: '完成月度费用报销审核；组织员工培训1次；完成招聘面试5人。',
      key_data: { '面试': '5人', '培训': '1次', '费用审核': '100%' },
      issues: '采购专员岗位招聘进展缓慢，已延期30天。'
    }
  }
])

const historyReports = ref([
  { id: 1, week_date: '2026-04-01周', dept_id: 1, dept_name: '营销中心', submitter_name: '张三', completed_items: '完成客户拜访18家，签订合同4份，销售额达到150万', self_evaluation: 'exceeded', submitted_at: '2026-04-05 17:30' },
  { id: 2, week_date: '2026-04-01周', dept_id: 2, dept_name: '产品中心', submitter_name: '李四', completed_items: '完成订单生产300件，合格率99%，处理质量问题2起', self_evaluation: 'met', submitted_at: '2026-04-05 16:45' },
  { id: 3, week_date: '2026-03-25周', dept_id: 1, dept_name: '营销中心', submitter_name: '张三', completed_items: '完成客户拜访12家，签订合同2份，销售额达到95万', self_evaluation: 'unmet', submitted_at: '2026-03-29 18:00' }
])

const form = reactive({
  dept_id: null,
  completed_items: '',
  next_week_plans: '',
  issues: '',
  self_evaluation: 'met'
})

const keyDataList = ref([
  { key: '', value: '' }
])

const rules = {
  dept_id: [{ required: true, message: '请选择所属中心', trigger: 'change' }],
  completed_items: [{ required: true, message: '请填写本周完成事项', trigger: 'blur' }]
}

function getEvaluationType(evaluation) {
  const map = { exceeded: 'success', met: 'primary', unmet: 'warning' }
  return map[evaluation] || 'info'
}

function getEvaluationText(evaluation) {
  const map = { exceeded: '超预期', met: '达成', unmet: '未达成' }
  return map[evaluation] || evaluation
}

function addKeyData() {
  keyDataList.value.push({ key: '', value: '' })
}

function removeKeyData(index) {
  keyDataList.value.splice(index, 1)
}

function showAddDialog() {
  form.dept_id = null
  form.completed_items = ''
  form.next_week_plans = ''
  form.issues = ''
  form.self_evaluation = 'met'
  keyDataList.value = [{ key: '', value: '' }]
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  
  // 整理关键数据
  const keyData = {}
  keyDataList.value.forEach(item => {
    if (item.key && item.value) {
      keyData[item.key] = item.value
    }
  })
  
  try {
    await axios.post('/api/reports', {
      ...form,
      week_date: selectedWeek.value,
      key_data: JSON.stringify(keyData)
    })
    ElMessage.success('提交成功')
    dialogVisible.value = false
    fetchReports()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

function viewReport(row) {
  selectedReport.value = row
  detailVisible.value = true
}

async function generateSummary() {
  aiSummary.value = `
    <h4>本周经营概况</h4>
    <p>各中心周报提交率100%，整体运营正常。</p>
    
    <h4>亮点</h4>
    <ul>
      <li>营销中心：新签合同3份，销售额120万，客户拜访15家</li>
      <li>产品中心：产量280件，合格率98.5%，工艺优化提升效率5%</li>
      <li>运营中心：完成招聘面试5人，员工培训1次</li>
    </ul>
    
    <h4>需关注问题</h4>
    <ul>
      <li><strong>营销中心</strong>：样品交付进度影响客户决策，需产品中心配合</li>
      <li><strong>产品中心</strong>：原材料供应商交期不稳定，建议启动备选供应商</li>
      <li><strong>运营中心</strong>：采购专员岗位空缺30天，需加快招聘进度</li>
    </ul>
    
    <h4>下周重点</h4>
    <ul>
      <li>营销中心：加大客户跟进力度，争取签订合同5份</li>
      <li>产品中心：加快样品交付，优先处理营销中心反馈</li>
      <li>运营中心：采购专员岗位招聘需在本周内完成</li>
    </ul>
  `
}

async function fetchReports() {
  try {
    const res = await axios.get('/api/reports', { params: { week_date: selectedWeek.value } })
    // 处理数据
  } catch (error) {
    console.error('获取周报失败:', error)
  }
}

onMounted(() => {
  fetchReports()
})
</script>

<style scoped>
.reports-page {
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

.summary-card {
  margin-bottom: 20px;
}

.dept-report-card {
  background: #f5f7fa;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
}

.dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dept-header h4 {
  margin: 0;
  font-size: 16px;
}

.section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.section-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.section-content.issue {
  padding: 10px;
  background: #fef0f0;
  border-radius: 6px;
  color: #f56c6c;
}

.key-data {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.data-tag {
  margin: 0;
}

.empty-report {
  text-align: center;
  padding: 30px 0;
  color: #c0c4cc;
}

.ai-summary-card {
  margin-bottom: 20px;
}

.summary-content {
  line-height: 1.8;
}

.summary-content h4 {
  margin: 15px 0 10px;
  color: #303133;
}

.summary-content h4:first-child {
  margin-top: 0;
}

.summary-content ul {
  margin: 5px 0 15px 20px;
}

.summary-content li {
  margin: 5px 0;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-data-input {
  width: 100%;
}

.data-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.report-detail .detail-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.report-detail h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.report-detail p {
  margin: 0;
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.issue-text {
  padding: 10px;
  background: #fef0f0;
  border-radius: 6px;
  color: #f56c6c;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .dept-report-card {
    margin-bottom: 10px;
  }
}
</style>
