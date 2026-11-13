import type { Prisma } from '../../infastructures/prisma/common/client';
import { resolveDepartmentScope } from '../constants/departments';

/** The one category whose events a director can narrow to a single department. */
export const SCHOOL_EVENT_CATEGORY = 'School';

/** What the portal's events form stores when a School event is for everyone. */
export const ALL_DEPARTMENTS = 'All Departments';

interface AudienceEvent {
  category: string;
  department: string | null;
}

/**
 * Every spelling the user's department goes by. Empty when they have no school
 * record (a beneficiary or donor account, or a volunteer who never filled it in).
 */
export function departmentAliases(
  department: string | null | undefined,
): string[] {
  const trimmed = department?.trim();
  if (!trimmed) return [];
  return resolveDepartmentScope(trimmed).aliases;
}

/** A School event aimed at one department, rather than at every department. */
export function isDepartmentScoped(event: AudienceEvent): boolean {
  if (
    event.category.trim().toLowerCase() !== SCHOOL_EVENT_CATEGORY.toLowerCase()
  ) {
    return false;
  }
  const department = event.department?.trim().toLowerCase();
  return Boolean(department) && department !== ALL_DEPARTMENTS.toLowerCase();
}

/**
 * Whether a mobile user may see and join the event. Anything that is not a
 * department-scoped School event is open to all; a scoped one only to users whose
 * school record names that department (under any of its spellings).
 */
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

/** The same rule as {@link isEventVisibleTo}, as a filter for event queries. */
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
