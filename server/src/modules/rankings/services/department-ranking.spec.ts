import { rankDepartments } from './department-ranking';

// The generated client is ESM, which Jest cannot load; only the college codes the
// alias map is keyed on are needed here.
jest.mock('../../../infastructures/prisma/common/client', () => ({
  ReportDepartment: {
    CCS: 'CCS',
    CBA: 'CBA',
    CEA: 'CEA',
    CNAHS: 'CNAHS',
    CAS: 'CAS',
    CCJE: 'CCJE',
  },
}));

const DEPARTMENTS = [
  'College of Computer Studies',
  'College of Nursing',
  'College of Maritime',
];

describe('rankDepartments', () => {
  it('lists every registered college, even one with nothing yet', () => {
    const board = rankDepartments(DEPARTMENTS, [], []);

    expect(board.entries.map((entry) => entry.name).sort()).toEqual(
      [...DEPARTMENTS].sort(),
    );
    expect(board.entries.every((entry) => entry.score === 0)).toBe(true);
  });

  it('merges every spelling of one college into one row', () => {
    const board = rankDepartments(
      DEPARTMENTS,
      [
        { department: 'CCS', hours: 4, eventsAttended: 1 },
        {
          department: 'college of computer studies',
          hours: 6,
          eventsAttended: 2,
        },
      ],
      [{ department: 'College of Computer Studies', amount: 500 }],
    );
    const ccs = board.entries.find((entry) => entry.code === 'CCS');

    expect(board.entries).toHaveLength(3);
    expect(ccs).toMatchObject({
      name: 'College of Computer Studies',
      volunteers: 2,
      eventsAttended: 3,
      hours: 10,
      donationAmount: 500,
      donations: 1,
    });
  });

  it('ranks hours and donations separately, and overall on equal shares', () => {
    const board = rankDepartments(
      DEPARTMENTS,
      [
        // CCS gives most of the hours, Nursing most of the pesos.
        { department: 'CCS', hours: 30, eventsAttended: 6 },
        { department: 'College of Nursing', hours: 10, eventsAttended: 2 },
      ],
      [
        { department: 'College of Nursing', amount: 9000 },
        { department: 'College of Maritime', amount: 1000 },
      ],
    );
    const byName = (name: string) =>
      board.entries.find((entry) => entry.name === name)!;

    expect(byName('College of Computer Studies').ranks.hours).toBe(1);
    expect(byName('College of Nursing').ranks.donations).toBe(1);
    // Nursing: 25% of hours + 90% of pesos → 57.5; CCS: 75% of hours → 37.5.
    expect(byName('College of Nursing').score).toBe(57.5);
    expect(byName('College of Computer Studies').score).toBe(37.5);
    expect(byName('College of Nursing').ranks.overall).toBe(1);
    expect(board.entries[0].name).toBe('College of Nursing');
  });

  it('reports what no college can be credited with instead of dropping it', () => {
    const board = rankDepartments(
      DEPARTMENTS,
      [{ department: null, hours: 3, eventsAttended: 1 }],
      [{ department: null, amount: 250 }],
    );

    expect(board.unattributed).toEqual({ hours: 3, donationAmount: 250 });
    expect(board.entries.every((entry) => entry.score === 0)).toBe(true);
  });
});
