import {
  AttendanceStatus,
  GeoValidationMethod,
  PrismaClient,
  RoleType,
} from '../common/client';

const HOUR = 60 * 60 * 1000;

interface VolunteerSeed {
  firstname: string;
  lastname: string;
  department: string;
  year_level: string;
  phone_number: string;
}

interface AttendanceSeed {
  volunteer: VolunteerSeed;
  status: AttendanceStatus;
  validation_method?: GeoValidationMethod;
  /** Hours after the event start; omitted when the device recorded nothing. */
  first_ping_offset?: number;
  last_ping_offset?: number;
  hours_rendered?: number;
  remarks?: string;
}

const DEPARTMENTS = ['CCS', 'CEA', 'CBA', 'CAS', 'CNAHS'] as const;
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;

const volunteer = (
  firstname: string,
  lastname: string,
  department: string,
  year_level: string,
  phone_number: string,
): VolunteerSeed => ({
  firstname,
  lastname,
  department,
  year_level,
  phone_number,
});

/**
 * Rosters keyed by position in the event list (newest first), so the seeder works
 * against whatever `seed:events` created without hard-coding event ids.
 */
const ROSTERS: AttendanceSeed[][] = [
  [
    {
      volunteer: volunteer(
        'Jomar',
        'Estrada',
        'CCS',
        '3rd Year',
        '+63 917 100 1101',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      last_ping_offset: 5,
      hours_rendered: 5,
    },
    {
      volunteer: volunteer(
        'Alyssa',
        'Rubio',
        'CCS',
        '2nd Year',
        '+63 917 100 1102',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      last_ping_offset: 5,
      hours_rendered: 5,
    },
    {
      volunteer: volunteer(
        'Kenneth',
        'Villanueva',
        'CEA',
        '4th Year',
        '+63 917 100 1103',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.OFFLINE_SYNC,
      first_ping_offset: 1,
      last_ping_offset: 5,
      hours_rendered: 4,
      remarks: 'No signal on site — coordinates pushed the next morning.',
    },
    {
      volunteer: volunteer(
        'Marianne',
        'Solon',
        'CBA',
        '1st Year',
        '+63 917 100 1104',
      ),
      status: AttendanceStatus.ABSENT,
      remarks: 'Did not arrive; no coordinates recorded.',
    },
    {
      volunteer: volunteer(
        'Ray',
        'Padilla',
        'CAS',
        '3rd Year',
        '+63 917 100 1105',
      ),
      status: AttendanceStatus.ABSENT,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 1,
      last_ping_offset: 2,
      hours_rendered: 0,
      remarks: 'Left the event area after an hour — validation did not pass.',
    },
    {
      volunteer: volunteer(
        'Chesca',
        'Lim',
        'CCS',
        '2nd Year',
        '+63 917 100 1106',
      ),
      status: AttendanceStatus.ABSENT,
      remarks: 'Withdrew two days before the event; no coordinates recorded.',
    },
  ],
  [
    {
      volunteer: volunteer(
        'Dianne',
        'Cabrera',
        'CNAHS',
        '4th Year',
        '+63 917 100 1201',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      last_ping_offset: 8,
      hours_rendered: 8,
    },
    {
      volunteer: volunteer(
        'Paulo',
        'Mendez',
        'CNAHS',
        '4th Year',
        '+63 917 100 1202',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      last_ping_offset: 8,
      hours_rendered: 8,
    },
    {
      volunteer: volunteer(
        'Trisha',
        'Bacus',
        'CNAHS',
        '3rd Year',
        '+63 917 100 1203',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.OFFLINE_SYNC,
      first_ping_offset: 1,
      last_ping_offset: 8,
      hours_rendered: 7,
    },
    {
      volunteer: volunteer(
        'Ivan',
        'Delos Reyes',
        'CAS',
        '2nd Year',
        '+63 917 100 1204',
      ),
      status: AttendanceStatus.PENDING,
      validation_method: GeoValidationMethod.AWAITING_SYNC,
      first_ping_offset: 1,
      remarks: 'Device still offline — coordinates not pushed yet.',
    },
    {
      volunteer: volunteer(
        'Grace',
        'Ortega',
        'CBA',
        '3rd Year',
        '+63 917 100 1205',
      ),
      status: AttendanceStatus.ABSENT,
    },
    {
      volunteer: volunteer(
        'Nino',
        'Almirante',
        'CEA',
        '1st Year',
        '+63 917 100 1206',
      ),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 2,
      last_ping_offset: 7,
      hours_rendered: 5,
    },
    {
      volunteer: volunteer('Sam', 'Yap', 'CCS', '4th Year', '+63 917 100 1207'),
      status: AttendanceStatus.COMPLETED,
      validation_method: GeoValidationMethod.MANUAL,
      first_ping_offset: 2,
      last_ping_offset: 7,
      hours_rendered: 5,
      remarks:
        'Phone battery died — coordinator vouched for the full duration.',
    },
  ],
  [
    {
      volunteer: volunteer(
        'Bea',
        'Fernandez',
        'CBA',
        '2nd Year',
        '+63 917 100 1301',
      ),
      status: AttendanceStatus.PENDING,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      remarks: 'Event still running — validation has not ruled yet.',
    },
    {
      volunteer: volunteer(
        'Miguel',
        'Tan',
        'CCS',
        '3rd Year',
        '+63 917 100 1302',
      ),
      status: AttendanceStatus.PENDING,
      validation_method: GeoValidationMethod.GEOFENCE,
      first_ping_offset: 0,
      remarks: 'Event still running — validation has not ruled yet.',
    },
    {
      volunteer: volunteer(
        'Loraine',
        'Abella',
        'CAS',
        '1st Year',
        '+63 917 100 1303',
      ),
      status: AttendanceStatus.PENDING,
      validation_method: GeoValidationMethod.AWAITING_SYNC,
      first_ping_offset: 1,
      remarks: 'Buffering coordinates offline.',
    },
    {
      volunteer: volunteer(
        'Hannah',
        'Sarmiento',
        'CNAHS',
        '2nd Year',
        '+63 917 100 1304',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Dave',
        'Roque',
        'CEA',
        '4th Year',
        '+63 917 100 1305',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Aira',
        'Nacua',
        'CCS',
        '1st Year',
        '+63 917 100 1306',
      ),
      status: AttendanceStatus.ABSENT,
      remarks: 'Class schedule conflict — did not join.',
    },
  ],
  [
    {
      volunteer: volunteer(
        'Carla',
        'Gonzaga',
        'CEA',
        '3rd Year',
        '+63 917 100 1401',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Jerome',
        'Batucan',
        'CCS',
        '2nd Year',
        '+63 917 100 1402',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Patricia',
        'Uy',
        'CBA',
        '4th Year',
        '+63 917 100 1403',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Ellen',
        'Manalo',
        'CAS',
        '2nd Year',
        '+63 917 100 1404',
      ),
      status: AttendanceStatus.PENDING,
    },
    {
      volunteer: volunteer(
        'Rico',
        'Salazar',
        'CNAHS',
        '1st Year',
        '+63 917 100 1405',
      ),
      status: AttendanceStatus.PENDING,
      remarks: 'Requested transfer to the next batch.',
    },
  ],
];

const emailFor = (seed: VolunteerSeed): string =>
  `${seed.firstname}.${seed.lastname}`.toLowerCase().replace(/\s+/g, '') +
  '@uclm.edu.ph';

const findOrCreateByName = async <T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> => (await find()) ?? (await create());

/**
 * Fills the portal's attendees table with a roster for the seeded events. Volunteers are
 * created on demand and matched by their login email, so re-running only updates.
 */
export const seedAttendance = async (prisma: PrismaClient): Promise<void> => {
  const events = await prisma.event.findMany({
    orderBy: { event_started: 'desc' },
    select: { event_id: true, event_started: true },
    take: ROSTERS.length,
  });

  if (events.length === 0) {
    console.log('No events found — run `pnpm seed:events` first.');
    return;
  }

  const volunteerRole = await findOrCreateByName(
    () => prisma.role.findFirst({ where: { type: RoleType.VOLUNTEER } }),
    () => prisma.role.create({ data: { type: RoleType.VOLUNTEER } }),
  );

  const major = await findOrCreateByName(
    () => prisma.major.findFirst(),
    () => prisma.major.create({ data: { name: 'Undeclared' } }),
  );

  const departments = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const department = await findOrCreateByName(
      () => prisma.department.findFirst({ where: { name } }),
      () => prisma.department.create({ data: { name } }),
    );
    departments.set(name, department.department_id);
  }

  const yearLevels = new Map<string, string>();
  for (const name of YEAR_LEVELS) {
    const yearLevel = await findOrCreateByName(
      () => prisma.yearLevel.findFirst({ where: { name } }),
      () => prisma.yearLevel.create({ data: { name } }),
    );
    yearLevels.set(name, yearLevel.year_level_id);
  }

  let written = 0;

  for (const [index, event] of events.entries()) {
    const roster = ROSTERS[index];
    if (!roster) continue;

    const start = event.event_started.getTime();

    for (const seed of roster) {
      const email = emailFor(seed.volunteer);

      const account = await prisma.account.findUnique({
        where: { email },
        select: { user_id: true },
      });

      let userId = account?.user_id;

      if (!userId) {
        const created = await prisma.user.create({
          data: {
            firstname: seed.volunteer.firstname,
            lastname: seed.volunteer.lastname,
            age: 20,
            current_address: 'University of Cebu – LM',
            phone_number: seed.volunteer.phone_number,
            role_id: volunteerRole.role_id,
            accounts: {
              // Seed volunteers exist for the roster only; the hash is not a usable login.
              create: { email, password: 'seed-no-login' },
            },
            user_school_info: {
              create: {
                id_number: seed.volunteer.phone_number.replace(/\D/g, ''),
                graduation_year: 2027,
                graduation_month: 6,
                graduation_day: 15,
                department_id: departments.get(seed.volunteer.department)!,
                major_id: major.major_id,
                year_level_id: yearLevels.get(seed.volunteer.year_level)!,
              },
            },
          },
          select: { user_id: true },
        });
        userId = created.user_id;
      }

      const attendance = {
        status: seed.status,
        validation_method: seed.validation_method ?? null,
        first_ping_at:
          seed.first_ping_offset === undefined
            ? null
            : new Date(start + seed.first_ping_offset * HOUR),
        last_ping_at:
          seed.last_ping_offset === undefined
            ? null
            : new Date(start + seed.last_ping_offset * HOUR),
        hours_rendered: seed.hours_rendered ?? null,
        remarks: seed.remarks ?? null,
      };

      await prisma.eventAttendance.upsert({
        where: {
          event_id_user_id: { event_id: event.event_id, user_id: userId },
        },
        update: attendance,
        create: {
          event_id: event.event_id,
          user_id: userId,
          registered_at: new Date(start - 7 * 24 * HOUR),
          ...attendance,
        },
      });

      written += 1;
    }
  }

  console.log(
    `Seeded ${written} attendance rows across ${events.length} events.`,
  );
};
