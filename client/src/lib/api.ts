import axios from 'axios'

export function normalizeRetriedApiUrl(url: string | undefined, baseURL: string | undefined): string | undefined {
  if (!url || !baseURL) return url

  const duplicatedBasePath = `${baseURL}${baseURL}/`

  if (url.startsWith(duplicatedBasePath)) {
    return `${baseURL}${url.substring(duplicatedBasePath.length - 1)}`
  }

  if (url.startsWith(`${baseURL}/`)) {
    return url.substring(baseURL.length)
  }

  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.pathname.startsWith(duplicatedBasePath)) {
      parsed.pathname = `${baseURL}${parsed.pathname.substring(duplicatedBasePath.length - 1)}`
      return parsed.toString()
    }
  } catch {
    return url
  }

  return url
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ADR-0009 §2.2: 401 → refresh-token retry once; if refresh also fails,
    // clear tokens and bounce to /login.
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const { data } = await axios.post('/connect/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: 'budget-tracker-dev',
          }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          // Guard: axios can mutate config.url to the full (baseURL + url)
          // after the first send. Re-running `api(config)` would then apply
          // the baseURL AGAIN, yielding /api/v1/api/v1/... → 404. Strip a
          // duplicate baseURL prefix before the retry.
          error.config.url = normalizeRetriedApiUrl(
            error.config.url,
            api.defaults.baseURL,
          )
          return api(error.config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }

    // ADR-0009 §2.2: 403 → the user is authenticated but lacks the role
    // policy for this route (e.g. Viewer hitting /budget-entries commit).
    // Send them to /forbidden instead of letting the axios error bubble
    // to the generic error boundary with no visible reason.
    if (error.response?.status === 403) {
      // Skip the redirect when we're already on /forbidden to avoid a loop.
      if (!window.location.pathname.startsWith('/forbidden')) {
        window.location.href = '/forbidden'
      }
    }

    return Promise.reject(error)
  }
)

export default api
