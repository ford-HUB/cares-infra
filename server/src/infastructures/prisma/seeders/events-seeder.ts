import { EventStatus, Prisma, PrismaClient } from '../common/client';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Sample images use public placeholder URLs so they render without S3 configuration. */
const img = (seed: string, w = 1200, h = 800): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const buildEvents = (now: number): Prisma.EventCreateManyInput[] => [
  {
    title: 'Coastal Cleanup Drive 2026',
    description:
      'Join the CARES community for a coastal cleanup along the Mandaue shoreline. Bring your energy and help us protect our marine environment.',
    event_started: new Date(now + 3 * DAY + 8 * HOUR),
    event_ended: new Date(now + 3 * DAY + 12 * HOUR),
    location: 'Mandaue City Reclamation Area, Cebu',
    max_participants: 150,
    participants: 42,
    organizer_name: 'Maria Santos',
    category: 'Environment',
    department: 'College of Arts and Sciences',
    images: [img('coastal-1'), img('coastal-2')],
    status: EventStatus.Upcoming,
    funds_donation: false,
    goods_donation: false,
    goods_types: [],
    beneficiary_applicable: false,
    max_beneficiaries: null,
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [123.945, 10.34],
          [123.947, 10.34],
          [123.947, 10.342],
          [123.945, 10.342],
          [123.945, 10.34],
        ],
      ],
    },
    area_sqm: 24500,
  },
  {
    title: 'Back-to-School Supplies Donation Drive',
    description:
      'A donation drive collecting school supplies and clothing for underprivileged students in Consolacion. Every contribution counts.',
    event_started: new Date(now - 1 * HOUR),
    event_ended: new Date(now + 6 * HOUR),
    location: 'University of Cebu - Mandaue Campus',
    max_participants: 300,
    participants: 187,
    organizer_name: 'Juan Dela Cruz',
    category: 'Donation Drive',
    department: 'College of Education',
    images: [img('school-1'), img('school-2'), img('school-3')],
    status: EventStatus.Ongoing,
    funds_donation: true,
    goods_donation: true,
    goods_types: ['Clothes', 'School Supplies', 'Books'],
    beneficiary_applicable: true,
    max_beneficiaries: 200,
    geojson: Prisma.DbNull,
    area_sqm: null,
  },
  {
    title: 'Community Health & Wellness Fair',
    description:
      'Free medical check-ups, dental services, and health seminars for the Liloan community. Organized in partnership with the local health office.',
    event_started: new Date(now + 10 * DAY + 9 * HOUR),
    event_ended: new Date(now + 10 * DAY + 15 * HOUR),
    location: 'Liloan Municipal Gymnasium, Cebu',
    max_participants: 500,
    participants: 0,
    organizer_name: 'Dr. Ana Reyes',
    category: 'Health',
    department: 'College of Nursing',
    images: [img('health-1')],
    status: EventStatus.Upcoming,
    funds_donation: false,
    goods_donation: false,
    goods_types: [],
    beneficiary_applicable: true,
    max_beneficiaries: null,
    geojson: Prisma.DbNull,
    area_sqm: null,
  },
  {
    title: 'Tree Planting Activity',
    description:
      'A reforestation effort in the uplands of Consolacion. Volunteers planted over 1,000 seedlings to help restore the local watershed.',
    event_started: new Date(now - 14 * DAY + 7 * HOUR),
    event_ended: new Date(now - 14 * DAY + 13 * HOUR),
    location: 'Consolacion Upland Barangay, Cebu',
    max_participants: 120,
    participants: 118,
    organizer_name: 'Maria Santos',
    category: 'Community',
    department: 'College of Arts and Sciences',
    images: [img('tree-1'), img('tree-2')],
    status: EventStatus.Completed,
    funds_donation: false,
    goods_donation: false,
    goods_types: [],
    beneficiary_applicable: false,
    max_beneficiaries: null,
    geojson: Prisma.DbNull,
    area_sqm: 18000,
  },
  {
    title: 'Relief Operations for Typhoon Victims',
    description:
      'Emergency relief distribution of food packs and essential goods for families affected by the recent typhoon.',
    event_started: new Date(now + 5 * DAY + 8 * HOUR),
    event_ended: new Date(now + 5 * DAY + 17 * HOUR),
    location: 'Mandaue City Sports Complex, Cebu',
    max_participants: 80,
    participants: 12,
    organizer_name: 'Pedro Alvarez',
    category: 'Relief Program',
    department: 'College of Business and Accountancy',
    images: [img('relief-1')],
    status: EventStatus.Cancelled,
    funds_donation: true,
    goods_donation: true,
    goods_types: ['Canned Goods', 'Rice', 'Water', 'Blankets'],
    beneficiary_applicable: true,
    max_beneficiaries: 500,
    geojson: Prisma.DbNull,
    area_sqm: null,
  },
  {
    title: 'Leadership & Values Seminar',
    description:
      'A one-day seminar on servant leadership and community values for student volunteers and coordinators.',
    event_started: new Date(now + 20 * DAY + 9 * HOUR),
    event_ended: new Date(now + 20 * DAY + 16 * HOUR),
    location: 'University of Cebu - Lapu-Lapu and Mandaue',
    max_participants: 200,
    participants: 55,
    organizer_name: 'Juan Dela Cruz',
    category: 'Seminar',
    department: 'College of Criminal Justice',
    images: [img('seminar-1'), img('seminar-2')],
    status: EventStatus.Upcoming,
    funds_donation: false,
    goods_donation: false,
    goods_types: [],
    beneficiary_applicable: false,
    max_beneficiaries: null,
    geojson: Prisma.DbNull,
    area_sqm: null,
  },
];

/** Replaces the whole event table with a demo set spanning every status. */
export const seedEvents = async (prisma: PrismaClient): Promise<void> => {
  const existing = await prisma.event.count();
  if (existing > 0) {
    await prisma.event.deleteMany({});
    console.log(`Cleared ${existing} existing event(s).`);
  }

  const result = await prisma.event.createMany({
    data: buildEvents(Date.now()),
  });

  console.log(`Seeded ${result.count} sample event(s).`);
};
