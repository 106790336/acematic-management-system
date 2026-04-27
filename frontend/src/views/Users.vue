<template>
  <div class="users-page">
    <div class="page-header">
      <div class="header-left">
        <h2>用户管理</h2>
        <p>管理系统用户账号和权限</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 新增用户
        </el-button>
      </div>
    </div>
    
    <!-- 用户列表 -->
    <el-card>
      <el-table :data="users" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="dept_name" label="部门" width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)">{{ getRoleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="editUser(row)">编辑</el-button>
            <el-button type="danger" link @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增/编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        
        <el-form-item label="部门">
          <el-select v-model="form.dept_id" placeholder="请选择部门" style="width: 100%">
            <el-option label="营销中心" :value="1" />
            <el-option label="产品中心" :value="2" />
            <el-option label="运营中心" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="运营总监" value="director" />
            <el-option label="中心负责人" value="manager" />
            <el-option label="普通员工" value="employee" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const users = ref([
  { id: 1, username: 'admin', name: '系统管理员', dept_id: null, dept_name: '-', role: 'admin', phone: '13800138000', email: 'admin@company.com', status: 'active' },
  { id: 2, username: 'zhangsan', name: '张三', dept_id: 1, dept_name: '营销中心', role: 'manager', phone: '13900139001', email: 'zhangsan@company.com', status: 'active' },
  { id: 3, username: 'lisi', name: '李四', dept_id: 2, dept_name: '产品中心', role: 'manager', phone: '13900139002', email: 'lisi@company.com', status: 'active' },
  { id: 4, username: 'wangwu', name: '王五', dept_id: 3, dept_name: '运营中心', role: 'director', phone: '13900139003', email: 'wangwu@company.com', status: 'active' }
])

const form = ref({
  username: '',
  password: '',
  name: '',
  dept_id: null,
  role: 'employee',
  phone: '',
  email: '',
  isActive: true
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

function getRoleType(role) {
  const map = { admin: 'danger', director: 'warning', manager: 'primary', employee: 'info' }
  return map[role] || 'info'
}

function getRoleText(role) {
  const map = { admin: '管理员', director: '运营总监', manager: '中心负责人', employee: '普通员工' }
  return map[role] || role
}

function showAddDialog() {
  isEdit.value = false
  form.value = {
    username: '',
    password: '',
    name: '',
    dept_id: null,
    role: 'employee',
    phone: '',
    email: '',
    isActive: true
  }
  dialogVisible.value = true
}

function editUser(row) {
  isEdit.value = true
  form.value = { ...row, password: '', isActive: row.status === 'active' }
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    if (isEdit.value) {
      await axios.put(`/api/users/${form.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      await axios.post('/api/users', form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchUsers()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function deleteUser(row) {
  await ElMessageBox.confirm(`确定要删除用户 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  
  try {
    await axios.delete(`/api/users/${row.id}`)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '删除失败')
  }
}

async function fetchUsers() {
  try {
    const res = await axios.get('/api/users')
    users.value = res.data
  } catch (error) {
    console.error('获取用户失败:', error)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-page {
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
</style>
