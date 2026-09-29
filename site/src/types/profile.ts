export interface ProfileInfo {
  firstname: string
  lastname: string
  email: string
  profileImage?: string
  signatureUrl?: string
  hasProfileImage?: boolean
  hasSignature?: boolean
  profile_complete?: boolean
  department?: string
  phone?: string
  phone_number?: string
  gender?: 'M' | 'F' | 'O'
  age?: number
  address?: {
    street?: string
    barangay?: string
    city?: string
    province?: string
  }
}

export interface ServiceResult<T = void> {
  success: boolean
  message?: string
  data?: T
}
