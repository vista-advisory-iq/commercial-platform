import axios from 'axios'

export async function login(email: string, password: string) {
  const res = await axios.post('/api/auth/login/', { email, password })
  localStorage.setItem('access', res.data.access)
  localStorage.setItem('refresh', res.data.refresh)
}

export function logout() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}
