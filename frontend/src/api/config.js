/**
 * API配置文件
 * 自动检测环境，使用对应的后端地址
 */

// 生产环境API地址（部署到Railway后替换）
const PROD_API_URL = 'https://your-backend-url.railway.app/api'

// 开发环境API地址
const DEV_API_URL = 'http://localhost:5000/api'

// 自动选择API地址
const API_BASE_URL = import.meta.env.PROD ? PROD_API_URL : DEV_API_URL

export default API_BASE_URL
