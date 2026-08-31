const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').trim()
const API_BASE = RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE

export function findTokenInObject(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null
  const targetKeys = [
    'token',
    'accesstoken',
    'access_token',
    'sessiontoken',
    'session_token',
    'jwt',
    'idtoken',
    'id_token',
    'sessionid',
    'session_id',
    'sid',
    'auth_token',
    'authtoken',
  ]

  const record = obj as Record<string, unknown>
  for (const key of Object.keys(record)) {
    const val = record[key]
    const lowerKey = key.toLowerCase()
    if (targetKeys.includes(lowerKey) && typeof val === 'string' && val.trim().length > 0) {
      return val.replace(/^Bearer\s+/i, '').trim()
    }
  }

  // Nested search
  for (const key of Object.keys(record)) {
    const val = record[key]
    if (val && typeof val === 'object') {
      const nestedToken = findTokenInObject(val)
      if (nestedToken) return nestedToken
    }
  }
  return null
}

export function saveToken(rawToken: string) {
  const clean = rawToken.replace(/^"(.*)"$/, '$1').replace(/^Bearer\s+/i, '').trim()
  if (!clean) return
  localStorage.setItem('pagewoga_token', clean)
  localStorage.setItem('sessionToken', clean)
  localStorage.setItem('token', clean)
  localStorage.setItem('admin_token', clean)
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const keys = [
    'pagewoga_token',
    'sessionToken',
    'token',
    'admin_token',
    'auth_token',
    'accessToken',
    'jwt',
    'session_id',
    'sessionId',
  ]
  for (const key of keys) {
    const val = localStorage.getItem(key)
    if (val && val.trim() !== '' && val !== 'null' && val !== 'undefined') {
      const clean = val.replace(/^"(.*)"$/, '$1').replace(/^Bearer\s+/i, '').trim()
      if (clean) return clean
    }
  }
  return null
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  if (!token) return {}
  return {
    Authorization: `Bearer ${token}`,
    authorization: `Bearer ${token}`,
    'x-access-token': token,
    'x-auth-token': token,
    'x-session-token': token,
    'session-token': token,
    token: token,
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  let fullUrl: string
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    fullUrl = cleanPath
  } else if (API_BASE === '/api' || API_BASE === '') {
    fullUrl = `/api${cleanPath}`
  } else if (API_BASE.endsWith('/api')) {
    fullUrl = `${API_BASE}${cleanPath}`
  } else if (API_BASE.startsWith('http')) {
    fullUrl = `${API_BASE}/api${cleanPath}`
  } else {
    fullUrl = `${API_BASE}${cleanPath}`
  }

  const authHeaders = getAuthHeaders()
  const customHeaders: Record<string, string> = {}
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        customHeaders[key] = value
      })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        customHeaders[key] = value
      })
    } else {
      Object.assign(customHeaders, options.headers)
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...customHeaders,
  }

  // Ensure authorization header is always present if token exists
  if (authHeaders.Authorization && !customHeaders.Authorization && !customHeaders.authorization) {
    requestHeaders.Authorization = authHeaders.Authorization
  }

  let response: Response
  try {
    response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers: requestHeaders,
    })
  } catch (netErr) {
    // If direct cross-origin fetch fails due to CORS or network, fallback through local /api proxy
    if (!fullUrl.startsWith('/api')) {
      try {
        response = await fetch(`/api${cleanPath}`, {
          ...options,
          credentials: 'include',
          headers: requestHeaders,
        })
      } catch (proxyErr) {
        throw new Error(
          `Network error connecting to ${fullUrl}: ${
            netErr instanceof Error ? netErr.message : 'Failed to fetch'
          }`,
          { cause: proxyErr }
        )
      }
    } else {
      throw new Error(
        `Network error connecting to backend: ${
          netErr instanceof Error ? netErr.message : 'Failed to fetch'
        }`,
        { cause: netErr }
      )
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => null)
    let errorMessage = errData?.message || errData?.error
    if (errorMessage && typeof errorMessage === 'string') {
      try {
        const parsed = JSON.parse(errorMessage)
        if (Array.isArray(parsed) && parsed[0]?.message) {
          errorMessage = parsed
            .map((item: { path?: string[]; message?: string }) => `${item.path?.join('.') || 'Field'}: ${item.message}`)
            .join(', ')
        }
      } catch {
        // use original string
      }
    }
    throw new Error(errorMessage ?? `Request failed (${response.status})`)
  }

  // Check if response headers returned an auth token
  const headerToken =
    response.headers.get('x-access-token') ||
    response.headers.get('x-auth-token') ||
    response.headers.get('authorization') ||
    response.headers.get('x-session-token') ||
    response.headers.get('token')
  if (headerToken) {
    saveToken(headerToken)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()
  const discoveredToken = findTokenInObject(data)
  if (discoveredToken) {
    saveToken(discoveredToken)
  }

  return data
}
