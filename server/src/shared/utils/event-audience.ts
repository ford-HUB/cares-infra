import type { Prisma } from '../../infastructures/prisma/common/client';
import { resolveDepartmentScope } from '../constants/departments';

/** The only category that can be narrowed to one department. */
export const SCHOOL_EVENT_CATEGORY = 'School';

/** Stored when a School event is for everyone. */
export const ALL_DEPARTMENTS = 'All Departments';

interface AudienceEvent {
  category: string;
  department: string | null;
}

/** Empty without a school record. */
export function departmentAliases(
  department: string | null | undefined,
): string[] {
  const trimmed = department?.trim();
  if (!trimmed) return [];
  return resolveDepartmentScope(trimmed).aliases;
}

export function isDepartmentScoped(event: AudienceEvent): boolean {
  if (
    event.category.trim().toLowerCase() !== SCHOOL_EVENT_CATEGORY.toLowerCase()
  ) {
    return false;
  }
  const department = event.department?.trim().toLowerCase();
  return Boolean(department) && department !== ALL_DEPARTMENTS.toLowerCase();
}

/** Department-scoped School events only for matching users (any spelling). */
export function isEventVisibleTo(
  event: AudienceEvent,
  userDepartment: string | null | undefined,
): boolean {
  if (!isDepartmentScoped(event)) return true;
  const target = event.department!.trim().toLowerCase();
  return departmentAliases(userDepartment).some(
    (alias) => alias.toLowerCase() === target,
  );
}

/** {@link isEventVisibleTo} as a query filter. */
export function eventAudienceWhere(
  userDepartment: string | null | undefined,
): Prisma.EventWhereInput {
  return {
    OR: [
      {
        NOT: {
          category: { equals: SCHOOL_EVENT_CATEGORY, mode: 'insensitive' },
        },
      },
      { department: null },
      { department: '' },
      { department: { equals: ALL_DEPARTMENTS, mode: 'insensitive' } },
      ...departmentAliases(userDepartment).map(
        (alias): Prisma.EventWhereInput => ({
          department: { equals: alias, mode: 'insensitive' },
        }),
      ),
    ],
  };
}
