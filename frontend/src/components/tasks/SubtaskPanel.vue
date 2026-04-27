<template>
  <div class="subtask-panel">
    <div class="panel-header">
      <div class="header-title">
        <el-icon><List /></el-icon>
        <span>子任务分解</span>
        <el-tag v-if="subtasks.length > 0" size="small" type="info">
          {{ completedCount }}/{{ subtasks.length }} 完成
        </el-tag>
      </div>
      
      <!-- 分解按钮 - 仅执行者可见 -->
      <el-button 
        v-if="canDecompose"
        type="primary" 
        size="small"
        @click="showDecomposeDialog"
        :disabled="task.status !== 'confirmed' && task.status !== 'in_progress'"
      >
        <el-icon><Plus /></el-icon>
        分解子任务
      </el-button>
    </div>
    
    <!-- 子任务列表 -->
    <div class="subtask-list" v-if="subtasks.length > 0">
      <!-- 权重模式选择 -->
      <div class="weight-mode-bar">
        <span>权重模式：</span>
        <el-radio-group v-model="weightMode" size="small" @change="updateWeightMode">
          <el-radio-button value="equal">均等</el-radio-button>
          <el-radio-button value="manual">手动</el-radio-button>
          <el-radio-button value="time">工时</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 子任务列表 -->
      <el-table :data="subtasks" style="width: 100%" size="small">
        <el-table-column prop="title" label="子任务名称" min-width="200">
          <template #default="{ row }">
            <div class="subtask-title">
              <span class="level-indicator" :style="{ paddingLeft: (row.current_level - 1) * 10 + 'px' }">
                <el-icon v-if="row.is_parent_task"><Folder /></el-icon>
                <el-icon v-else><Document /></el-icon>
              </span>
              <span>{{ row.title }}</span>
              <el-tag v-if="row.current_level > 1" size="small" type="warning">L{{ row.current_level }}</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="assignee_name" label="执行人" width="100" />
        
        <el-table-column label="权重" width="80">
          <template #default="{ row }">
            <el-input-number 
              v-if="weightMode === 'manual'"
              v-model="row.subtask_weight"
              :min="0" :max="100" :step="5"
              size="small"
              @change="updateWeight(row)"
            />
            <span v-else>{{ row.subtask_weight }}%</span>
          </template>
        </el-table-column>
        
        <el-table-column label="进度" width="120">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.progress" 
              :status="row.status === 'completed' ? 'success' : ''"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="due_date" label="截止日期" width="100" />
        
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="row.is_parent_task"
              type="primary" link size="small"
              @click="viewSubtask(row.id)"
            >
              查看子任务
            </el-button>
            <el-button 
              v-if="canDecompose && row.current_level < maxLevel"
              type="primary" link size="small"
              @click="decomposeSubtask(row)"
            >
              继续分解
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 父任务进度汇总 -->
      <div class="progress-summary">
        <span>父任务进度（自动计算）：</span>
        <el-progress :percentage="task.progress" :stroke-width="12" />
        <span class="formula">= Σ(子进度 × 权重) / Σ(权重)</span>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <el-empty description="暂无子任务">
        <el-button 
          v-if="canDecompose"
          type="primary" 
          @click="showDecomposeDialog"
          :disabled="task.status !== 'confirmed' && task.status !== 'in_progress'"
        >
          立即分解
        </el-button>
      </el-empty>
    </div>
    
    <!-- 分解子任务弹窗 -->
    <el-dialog 
      v-model="decomposeDialogVisible"
      title="分解子任务"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="newSubtask" label-width="100px">
        <el-form-item label="子任务名称" required>
          <el-input v-model="newSubtask.title" placeholder="例如：需求调研" />
        </el-form-item>
        
        <el-form-item label="任务描述">
          <el-input v-model="newSubtask.description" type="textarea" :rows="3" />
        </el-form-item>
        
        <el-form-item label="执行人" required>
          <el-select v-model="newSubtask.assignee_id" placeholder="选择执行人" style="width: 100%">
            <el-option 
              v-for="user in availableUsers"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
          <div class="hint">可以分配给自己或其他团队成员</div>
        </el-form-item>
        
        <el-form-item label="权重（%）">
          <el-input-number 
            v-model="newSubtask.subtask_weight"
            :min="0" :max="100" :step="5"
            v-if="weightMode === 'manual'"
          />
          <span v-else class="hint">均等模式下自动分配</span>
        </el-form-item>
        
        <el-form-item label="截止日期">
          <el-date-picker 
            v-model="newSubtask.due_date"
            type="date"
            placeholder="选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="预估工时">
          <el-input-number v-model="newSubtask.estimated_hours" :min="0" :step="0.5" />
          <span class="unit">小时</span>
        </el-form-item>
        
        <el-form-item label="战略对齐">
          <el-select v-model="newSubtask.strategy_id" placeholder="关联战略目标" clearable style="width: 100%">
            <el-option 
              v-for="strategy in strategies"
              :key="strategy.id"
              :label="strategy.title"
              :value="strategy.id"
            />
          </el-select>
        </el-form-item>
        
        <el-alert 
          type="info" 
          :closable="false"
          show-icon
        >
          <template #title>
            分解规则：父任务进度将根据子任务进度自动计算，所有子任务完成后才能提交父任务验收。
          </template>
        </el-alert>
      </el-form>
      
      <template #footer>
        <el-button @click="decomposeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createSubtask" :loading="creating">
          创建子任务
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { List, Plus, Folder, Document } from '@element-plus/icons-vue'
import axios from '@/api/config'

// Props
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  canDecompose: {
    type: Boolean,
    default: false
  },
  maxLevel: {
    type: Number,
    default: 3
  }
})

// Emits
const emit = defineEmits(['task-updated', 'subtask-created'])

// Data
const subtasks = ref([])
const weightMode = ref('equal')
const decomposeDialogVisible = ref(false)
const creating = ref(false)
const strategies = ref([])
const availableUsers = ref([])

const newSubtask = ref({
  title: '',
  description: '',
  assignee_id: null,
  subtask_weight: 0,
  due_date: null,
  estimated_hours: 0,
  strategy_id: null
})

// Computed
const completedCount = computed(() => {
  return subtasks.value.filter(st => st.status === 'completed').length
})

// Methods
const getStatusType = (status) => {
  const map = {
    'pending': 'info',
    'confirmed': '',
    'in_progress': 'warning',
    'submitted': 'primary',
    'completed': 'success',
    'rejected': 'danger',
    'returned': 'warning',
    'paused': 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'pending': '待确认',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'submitted': '待验收',
    'completed': '已完成',
    'rejected': '已拒绝',
    'returned': '需修改',
    'paused': '已暂停'
  }
  return map[status] || status
}

const fetchSubtasks = async () => {
  if (!props.task.id || !props.task.is_parent_task) {
    subtasks.value = []
    return
  }
  
  try {
    const res = await axios.get(`/api/tasks`, {
      params: { parent_id: props.task.id }
    })
    subtasks.value = res.data
  } catch (error) {
    console.error('获取子任务失败:', error)
  }
}

const fetchUsers = async () => {
  try {
    const res = await axios.get('/api/users')
    availableUsers.value = res.data
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

const showDecomposeDialog = () => {
  newSubtask.value = {
    title: '',
    description: '',
    assignee_id: props.task.assignee_id, // 默认分配给自己
    subtask_weight: 0,
    due_date: props.task.due_date ? new Date(props.task.due_date) : null,
    estimated_hours: 0,
    strategy_id: props.task.strategy_id
  }
  decomposeDialogVisible.value = true
}

const createSubtask = async () => {
  if (!newSubtask.value.title) {
    ElMessage.warning('请输入子任务名称')
    return
  }
  if (!newSubtask.value.assignee_id) {
    ElMessage.warning('请选择执行人')
    return
  }
  
  creating.value = true
  
  try {
    const res = await axios.post('/api/tasks', {
      title: newSubtask.value.title,
      description: newSubtask.value.description,
      assignee_id: newSubtask.value.assignee_id,
      parent_task_id: props.task.id,
      subtask_weight: newSubtask.value.subtask_weight,
      due_date: newSubtask.value.due_date ? newSubtask.value.due_date.toISOString().split('T')[0] : null,
      estimated_hours: newSubtask.value.estimated_hours,
      strategy_id: newSubtask.value.strategy_id,
      source_type: 'task_decomposition',
      source_id: props.task.id,
      source_description: `从任务"${props.task.title}"分解`
    })
    
    ElMessage.success('子任务创建成功')
    decomposeDialogVisible.value = false
    await fetchSubtasks()
    emit('subtask-created', res.data.task)
    emit('task-updated')
    
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '创建失败')
  } finally {
    creating.value = false
  }
}

const updateWeightMode = async () => {
  try {
    await axios.put(`/api/tasks/${props.task.id}/subtasks/weights`, {
      weight_mode: weightMode.value
    })
    await fetchSubtasks()
    ElMessage.success('权重模式已更新')
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

const updateWeight = async (subtask) => {
  try {
    await axios.put(`/api/tasks/${props.task.id}/subtasks/weights`, {
      weights: { [subtask.id]: subtask.subtask_weight }
    })
    emit('task-updated')
  } catch (error) {
    ElMessage.error('权重更新失败')
  }
}

const viewSubtask = (subtaskId) => {
  // 跳转到子任务详情
  emit('view-task', subtaskId)
}

const decomposeSubtask = (subtask) => {
  // 继续分解子任务
  newSubtask.value = {
    title: '',
    description: '',
    assignee_id: subtask.assignee_id,
    subtask_weight: 0,
    due_date: subtask.due_date ? new Date(subtask.due_date) : null,
    estimated_hours: 0,
    strategy_id: subtask.strategy_id
  }
  // 设置父任务为当前子任务
  decomposeDialogVisible.value = true
}

// Watch
watch(() => props.task.id, fetchSubtasks, { immediate: true })

// Mount
onMounted(() => {
  weightMode.value = props.task.subtask_weight_mode || 'equal'
  fetchUsers()
})
</script>

<style scoped>
.subtask-panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.weight-mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.subtask-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-indicator {
  display: inline-flex;
  align-items: center;
}

.progress-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #e8f4ff;
  border-radius: 6px;
  margin-top: 16px;
}

.formula {
  color: #909399;
  font-size: 12px;
}

.hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.unit {
  margin-left: 8px;
  color: #606266;
}

.empty-state {
  padding: 40px 0;
}
</style>