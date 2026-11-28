import { ReportDepartment } from '../../infastructures/prisma/common/client';

/** Profiles (free text), events (full name), reports (enum) and school records (OCR) all spell colleges differently. */
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
  /** When the profile text maps to a report college. */
  code: ReportDepartment | null;
  aliases: string[];
}

/** Unknown text still scopes to itself, so exact matches show. */
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
