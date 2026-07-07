import { USE_MOCK_API } from './api-client'
import type { ManagedUser, ManageUsersResult } from '../types/manage-users'

const mockUsers: ManagedUser[] = [
  {
    id: 'u1',
    email: 'ana.lopez@uclm.edu.ph',
    firstName: 'Ana',
    lastName: 'Lopez',
    role: 'staff',
    status: 'active',
    department: 'Student Affairs',
  },
  {
    id: 'u2',
    email: 'juan.reyes@uclm.edu.ph',
    firstName: 'Juan',
    lastName: 'Reyes',
    role: 'coordinator',
    status: 'active',
    department: 'Engineering',
  },
  {
    id: 'u3',
    email: 'pending@uclm.edu.ph',
    firstName: 'Lea',
    lastName: 'Cruz',
    role: 'staff',
    status: 'pending',
    department: 'Nursing',
  },
]

export async function listManagedUsers(): Promise<ManageUsersResult> {
  if (USE_MOCK_API) {
    return { success: true, list: mockUsers }
  }
  return { success: false, message: 'Backend not wired', list: [] }
}

export async function deactivateManagedUser(
  _id: string,
  _reason: string,
): Promise<{ success: boolean; message?: string }> {
  if (USE_MOCK_API) {
    return { success: true, message: 'User deactivated (mock)' }
  }
  return { success: false, message: 'Backend not wired' }
}

export async function restoreManagedUser(
  _id: string,
): Promise<{ success: boolean; message?: string }> {
  if (USE_MOCK_API) {
    return { success: true, message: 'User restored (mock)' }
  }
  return { success: false, message: 'Backend not wired' }
}
