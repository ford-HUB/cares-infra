/**
 * Shared domain services migrated from Capstone `services/common/*`.
 * Each function returns mock data when VITE_USE_MOCK_API=true (default).
 * Replace mock branches with apiClient calls when backend is wired.
 */

export * from './attendance-service'
export * from './certificate-service'
export * from './document-service'
export * from './event-service'
export * from './form-service'
export * from './statistics-service'
export * from './volunteer-service'
