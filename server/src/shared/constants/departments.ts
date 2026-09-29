import { ReportDepartment } from '../../infastructures/prisma/common/client';

/**
 * Every spelling a college goes by across the system. A portal profile carries the
 * department as free text (usually the code), an event carries the full name the
 * events form offers, a monthly report carries the enum code, and a volunteer's
 * school record carries whatever the ID scan read. Scoping anything "to a
 * department" has to accept all of them.
 */
export const DEPARTMENT_ALIASES: Record<ReportDepartment, readonly string[]> = {
  [ReportDepartment.CCS]: ['CCS', 'College of Computer Studies'],
  [ReportDepartment.CBA]: [
    'CBA',
    'College of Business Administration',
    'College of Business & Accountancy',
    'College of Business and Accountancy',
  ],
  [ReportDepartment.CEA]: [
    'CEA',
    'College of Engineering & Architecture',
    'College of Engineering and Architecture',
    'College of Engineering',
  ],
  [ReportDepartment.CNAHS]: [
    'CNAHS',
    'College of Nursing & Allied Health Sciences',
    'College of Nursing and Allied Health Sciences',
    'College of Nursing',
  ],
  [ReportDepartment.CAS]: [
    'CAS',
    'College of Arts & Sciences',
    'College of Arts and Sciences',
  ],
  [ReportDepartment.CCJE]: ['CCJE', 'College of Criminal Justice Education'],
};

export interface DepartmentScope {
  /** The enum code, when the profile text maps to one of the report colleges. */
  code: ReportDepartment | null;
  /** Every spelling to match against free-text department columns. */
  aliases: string[];
}

/**
 * Resolves a profile's free-text department to its code and full alias list.
 * Unknown text still scopes — to itself only — so a college the map does not know
 * yet shows the rows that spell it exactly the same way, rather than nothing.
 */
export function resolveDepartmentScope(
  profileDepartment: string,
): DepartmentScope {
  const needle = profileDepartment.trim().toLowerCase();
  for (const [code, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === needle)) {
      return { code: code as ReportDepartment, aliases: [...aliases] };
    }
  }
  return { code: null, aliases: [profileDepartment.trim()] };
}
