export interface PortalProfileApiResponse {
  firstname: string
  lastname: string
  email: string
  has_profile_image: boolean
  has_signature: boolean
  department: string | null
  phone_number: string
  gender: string
  profile_complete: boolean
  address: {
    street: string | null
    barangay: string | null
    city: string | null
    province: string | null
  }
  role_type: string
}
