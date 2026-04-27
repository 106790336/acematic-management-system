import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../layouts/MainLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '运营驾驶舱', icon: 'DataAnalysis' }
      },
      {
        path: 'goals',
        name: 'Goals',
        component: () => import('../views/Goals.vue'),
        meta: { title: '年度目标', icon: 'Target' }
      },
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('../views/Plans.vue'),
        meta: { title: '月度计划', icon: 'Calendar' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/Reports.vue'),
        meta: { title: '周报管理', icon: 'Document' }
      },
      {
        path: 'issues',
        name: 'Issues',
        component: () => import('../views/Issues.vue'),
        meta: { title: '问题清单', icon: 'Warning' }
      },
      {
        path: 'analysis',
        name: 'Analysis',
        component: () => import('../views/Analysis.vue'),
        meta: { title: '月度分析', icon: 'TrendCharts' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 运营管理系统` : '运营管理系统'
  
  // 检查登录状态
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
