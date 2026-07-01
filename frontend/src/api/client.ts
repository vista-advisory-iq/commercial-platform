import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string> | null = null

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true
    try {
      if (!refreshing) {
        refreshing = axios
          .post('/api/auth/refresh/', { refresh: localStorage.getItem('refresh') })
          .then((r) => {
            localStorage.setItem('access', r.data.access)
            return r.data.access
          })
          .finally(() => { refreshing = null })
      }
      const newToken = await refreshing
      original.headers.Authorization = `Bearer ${newToken}`
      return client(original)
    } catch {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      window.location.href = '/login'
      return Promise.reject(error)
    }
  },
)

export default client
