export interface ManagedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  department?: string
}

export interface ManageUsersResult {
  success: boolean
  message?: string
  list: ManagedUser[]
}
