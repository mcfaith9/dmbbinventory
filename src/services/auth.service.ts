import { ref } from 'vue'

const AUTH_KEY = 'dmbb_inventory_auth_user'

export interface AuthUser {
  name: string
  email: string
  role: string
  avatar: string
}

const defaultUser: AuthUser = {
  name: 'Warehouse Operator',
  email: 'admin@dmbbinventory.local',
  role: 'Inventory Manager',
  avatar: '',
}

const currentUser = ref<AuthUser | null>(getStoredSession())

function getStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return null
}

export const AuthService = {
  user: currentUser,

  isAuthenticated(): boolean {
    return !!currentUser.value
  },

  async verifyOtp(otp: string): Promise<{ success: boolean; message?: string }> {
    // 6-digit OTP verification: any 6-digit code or demo '123456' succeeds
    if (!otp || otp.length < 6) {
      return { success: false, message: 'Please enter all 6 digits.' }
    }

    const session: AuthUser = {
      ...defaultUser,
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(session))
    currentUser.value = session
    return { success: true }
  },

  logout(): void {
    localStorage.removeItem(AUTH_KEY)
    currentUser.value = null
  },

  getUser(): AuthUser {
    return currentUser.value || defaultUser
  },
}
