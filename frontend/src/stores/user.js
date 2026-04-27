import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  
  // 设置请求拦截器
  axios.interceptors.request.use(config => {
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`
    }
    return config
  })
  
  // 响应拦截器
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        logout()
      }
      return Promise.reject(error)
    }
  )
  
  async function login(username, password) {
    const res = await axios.post('/api/auth/login', { username, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    return res.data
  }
  
  async function fetchProfile() {
    if (!token.value) return
    try {
      const res = await axios.get('/api/auth/profile')
      user.value = res.data
    } catch (e) {
      logout()
    }
  }
  
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }
  
  function hasRole(roles) {
    if (!user.value) return false
    if (typeof roles === 'string') roles = [roles]
    return roles.includes(user.value.role)
  }
  
  return {
    user,
    token,
    login,
    logout,
    fetchProfile,
    hasRole
  }
})
