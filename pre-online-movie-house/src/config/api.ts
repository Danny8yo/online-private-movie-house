/**
 * API 配置文件
 * 可根据环境变量或本地存储动态修改后端地址
 */

// 默认后端地址
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// 从localStorage获取自定义API地址（如果用户在设置中修改过）
const getApiUrl = (): string => {
  const customUrl = localStorage.getItem('api_url')
  return customUrl || DEFAULT_API_URL
}

// 设置自定义API地址
const setApiUrl = (url: string): void => {
  localStorage.setItem('api_url', url)
  // 清空旧的api实例，强制重新创建
  localStorage.removeItem('api_instance_initialized')
}

export { getApiUrl, setApiUrl, DEFAULT_API_URL }
