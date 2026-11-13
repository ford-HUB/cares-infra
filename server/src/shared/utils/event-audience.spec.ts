import {
  eventAudienceWhere,
  isDepartmentScoped,
  isEventVisibleTo,
} from './event-audience';

// The generated client is ESM, which Jest cannot load; only the college codes the
// alias map is keyed on are needed here.
jest.mock('../../infastructures/prisma/common/client', () => ({
  ReportDepartment: {
    CCS: 'CCS',
    CBA: 'CBA',
    CEA: 'CEA',
    CNAHS: 'CNAHS',
    CAS: 'CAS',
    CCJE: 'CCJE',
  },
}));

const nursingEvent = { category: 'School', department: 'College of Nursing' };

describe('event audience', () => {
  it('scopes only School events that name one department', () => {
    expect(isDepartmentScoped(nursingEvent)).toBe(true);
    expect(
      isDepartmentScoped({ category: 'School', department: 'All Departments' }),
    ).toBe(false);
    expect(isDepartmentScoped({ category: 'School', department: null })).toBe(
      false,
    );
    expect(
      isDepartmentScoped({
        category: 'Community',
        department: 'College of Nursing',
      }),
    ).toBe(false);
  });

  it('shows a scoped event only to members of its department', () => {
    expect(isEventVisibleTo(nursingEvent, 'College of Nursing')).toBe(true);
    expect(isEventVisibleTo(nursingEvent, '  college of nursing ')).toBe(true);
    expect(isEventVisibleTo(nursingEvent, 'College of Computer Studies')).toBe(
      false,
    );
    expect(isEventVisibleTo(nursingEvent, null)).toBe(false);
  });

  it('accepts any spelling of the same college', () => {
    expect(
      isEventVisibleTo(
        { category: 'School', department: 'College of Computer Studies' },
        'CCS',
      ),
    ).toBe(true);
  });

  it('leaves unscoped events visible to everyone', () => {
    expect(
      isEventVisibleTo(
        { category: 'School', department: 'All Departments' },
        null,
      ),
    ).toBe(true);
    expect(
      isEventVisibleTo(
        { category: 'Health', department: 'College of Nursing' },
        null,
      ),
    ).toBe(true);
  });

  it('builds a filter that only adds department matches for the user', () => {
    expect(eventAudienceWhere(null).OR).toHaveLength(4);
    expect(eventAudienceWhere('College of Criminology').OR).toContainEqual({
      department: { equals: 'College of Criminology', mode: 'insensitive' },
    });
  });
});
