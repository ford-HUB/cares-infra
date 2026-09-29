import {
  MonthlyReportDocumentKind,
  MonthlyReportStatus,
  MonthlyReportTrailAction,
  PrismaClient,
  ReportDepartment,
  RoleType,
} from '../common/client';
import { S3Service } from '../../s3/s3-service';

const DAY = 24 * 60 * 60 * 1000;

interface ReportSeed {
  title: string;
  period: string;
  department: ReportDepartment;
  status: MonthlyReportStatus;
  summary: string;
  coordinator: { name: string; email: string; title: string };
  metrics: {
    events: number;
    volunteers: number;
    serviceHours: number;
    beneficiaries: number;
  };
  /** Days before now the coordinator submitted; the trail is built off this. */
  submittedDaysAgo: number;
  decisionNote?: string;
  /** Extra annex beside the narrative, so a folder holds more than one file per report. */
  annex?: string;
}

const SEEDS: ReportSeed[] = [
  {
    title: 'CCS Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CCS,
    status: MonthlyReportStatus.APPROVED,
    summary:
      'Two coding literacy caravans and one e-waste drive, run with the Mandaue City ICT office.',
    coordinator: {
      name: 'Alvin Perez',
      email: 'alvin.perez@cares.edu.ph',
      title: 'CCS Volunteer Coordinator',
    },
    metrics: {
      events: 3,
      volunteers: 48,
      serviceHours: 264,
      beneficiaries: 410,
    },
    submittedDaysAgo: 21,
    decisionNote: 'Figures reconcile with the attendance exports. Filed.',
    annex: 'CCS-Annex-A-Attendance-August-2026.pdf',
  },
  {
    title: 'CNAHS Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CNAHS,
    status: MonthlyReportStatus.APPROVED,
    summary:
      'One medical mission and one dental caravan with the Cebu City Health Department.',
    coordinator: {
      name: 'Miguel Sarmiento',
      email: 'miguel.sarmiento@cares.edu.ph',
      title: 'CNAHS Volunteer Coordinator',
    },
    metrics: {
      events: 2,
      volunteers: 44,
      serviceHours: 236,
      beneficiaries: 358,
    },
    submittedDaysAgo: 19,
    decisionNote: 'Approved — referral list attached as filed.',
    annex: 'CNAHS-Annex-A-Referrals-August-2026.pdf',
  },
  {
    title: 'CEA Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CEA,
    status: MonthlyReportStatus.APPROVED,
    summary:
      'Structural assessment of two barangay day-care centres and a footbridge repair drive.',
    coordinator: {
      name: 'Rowena Lim',
      email: 'rowena.lim@cares.edu.ph',
      title: 'CEA Volunteer Coordinator',
    },
    metrics: {
      events: 2,
      volunteers: 31,
      serviceHours: 188,
      beneficiaries: 240,
    },
    submittedDaysAgo: 18,
  },
  {
    title: 'CBA Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CBA,
    status: MonthlyReportStatus.APPROVED,
    summary:
      'Livelihood bookkeeping workshops for two sari-sari store associations.',
    coordinator: {
      name: 'Dennis Ochoa',
      email: 'dennis.ochoa@cares.edu.ph',
      title: 'CBA Volunteer Coordinator',
    },
    metrics: {
      events: 2,
      volunteers: 26,
      serviceHours: 142,
      beneficiaries: 165,
    },
    submittedDaysAgo: 17,
  },
  {
    title: 'CCS Monthly Accomplishment Report — July 2026',
    period: '2026-07',
    department: ReportDepartment.CCS,
    status: MonthlyReportStatus.APPROVED,
    summary:
      'Community computer refurbishment and a barangay records digitisation sprint.',
    coordinator: {
      name: 'Alvin Perez',
      email: 'alvin.perez@cares.edu.ph',
      title: 'CCS Volunteer Coordinator',
    },
    metrics: {
      events: 2,
      volunteers: 39,
      serviceHours: 205,
      beneficiaries: 288,
    },
    submittedDaysAgo: 52,
    decisionNote: 'Approved.',
  },
  {
    title: 'CAS Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CAS,
    status: MonthlyReportStatus.UNDER_REVIEW,
    summary:
      'Literacy tutoring in two elementary schools and a coastal clean-up.',
    coordinator: {
      name: 'Grace Tolentino',
      email: 'grace.tolentino@cares.edu.ph',
      title: 'CAS Volunteer Coordinator',
    },
    metrics: {
      events: 3,
      volunteers: 52,
      serviceHours: 271,
      beneficiaries: 395,
    },
    submittedDaysAgo: 4,
    annex: 'CAS-Annex-A-Tutoring-Logs-August-2026.pdf',
  },
  {
    title: 'CCJE Monthly Accomplishment Report — August 2026',
    period: '2026-08',
    department: ReportDepartment.CCJE,
    status: MonthlyReportStatus.RETURNED,
    summary:
      'Barangay peacekeeping seminar and a drug-awareness caravan for two high schools.',
    coordinator: {
      name: 'Jonas Villamor',
      email: 'jonas.villamor@cares.edu.ph',
      title: 'CCJE Volunteer Coordinator',
    },
    metrics: {
      events: 2,
      volunteers: 23,
      serviceHours: 96,
      beneficiaries: 180,
    },
    submittedDaysAgo: 9,
    decisionNote:
      'Service hours do not match the attendance export for the 14 August caravan — recheck and resubmit.',
  },
];

/**
 * A one-page PDF built by hand, so the seeder needs no document library and the file
 * the director opens is a real PDF rather than a renamed text file.
 */
const buildPdf = (title: string, lines: string[]): Buffer => {
  const escape = (text: string) => text.replace(/([()\\])/g, '\\$1');
  const body = [title, '', ...lines]
    .map(
      (line, index) =>
        `BT /F1 ${index === 0 ? 14 : 11} Tf 64 ${720 - index * 22} Td (${escape(line)}) Tj ET`,
    )
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
};

const narrative = (seed: ReportSeed): string[] => [
  `Reporting period: ${seed.period}`,
  `College: ${seed.department}`,
  '',
  'I. OVERVIEW',
  seed.summary,
  '',
  'II. FIGURES',
  `Events held: ${seed.metrics.events}`,
  `Volunteers deployed: ${seed.metrics.volunteers}`,
  `Service hours rendered: ${seed.metrics.serviceHours}`,
  `Beneficiaries served: ${seed.metrics.beneficiaries}`,
  '',
  'Prepared by:',
  seed.coordinator.name.toUpperCase(),
  seed.coordinator.title,
];

/**
 * Fills the director's Monthly Report board: submissions across three months and six
 * colleges, each with a real PDF in the bucket, plus one director-made folder so the
 * library has a shelf that is not a college.
 *
 * Attachments need AWS credentials. Without them the reports are still seeded — the
 * board reads correctly, the file list is simply empty — so the seeder stays usable on
 * a machine with no bucket configured.
 */
export const seedMonthlyReports = async (
  prisma: PrismaClient,
): Promise<void> => {
  const director = await prisma.user.findFirst({
    where: { role: { type: RoleType.DIRECTOR } },
    select: { user_id: true, firstname: true, lastname: true },
  });

  const reviewerName = director
    ? `${director.firstname} ${director.lastname}`
    : 'Director Office';

  const bucketConfigured = Boolean(
    process.env.AWS_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY &&
    process.env.AWS_SECRET_KEY,
  );

  if (!bucketConfigured) {
    console.warn(
      'AWS credentials are not set — seeding monthly reports without attachments.',
    );
  }

  const s3 = bucketConfigured ? new S3Service() : null;
  const now = Date.now();
  let sequence = await nextSequence(prisma);

  for (const seed of SEEDS) {
    const reference = `MR-${new Date().getFullYear()}-${String(sequence).padStart(3, '0')}`;
    sequence += 1;

    const existing = await prisma.monthlyReport.findFirst({
      where: {
        period: seed.period,
        department: seed.department,
        title: seed.title,
      },
      select: { monthly_report_id: true },
    });

    if (existing) {
      console.log(`Monthly report already seeded: ${seed.title}`);
      continue;
    }

    const submittedAt = new Date(now - seed.submittedDaysAgo * DAY);
    const decided = seed.status !== MonthlyReportStatus.UNDER_REVIEW;
    const decidedAt = decided
      ? new Date(submittedAt.getTime() + 2 * DAY)
      : null;

    const report = await prisma.monthlyReport.create({
      data: {
        reference,
        title: seed.title,
        period: seed.period,
        department: seed.department,
        status: seed.status,
        summary: seed.summary,
        metric_events: seed.metrics.events,
        metric_volunteers: seed.metrics.volunteers,
        metric_service_hours: seed.metrics.serviceHours,
        metric_beneficiaries: seed.metrics.beneficiaries,
        submitted_by_name: seed.coordinator.name,
        submitted_by_email: seed.coordinator.email,
        submitted_by_title: seed.coordinator.title,
        submitted_at: submittedAt,
        reviewer_user_id: decided ? (director?.user_id ?? null) : null,
        reviewer_name: decided ? reviewerName : null,
        decided_at: decidedAt,
        decision_note: decided ? (seed.decisionNote ?? null) : null,
        trail: {
          create: [
            {
              action: MonthlyReportTrailAction.SUBMITTED,
              actor_name: seed.coordinator.name,
              createdAt: submittedAt,
            },
            ...(decided && decidedAt
              ? [
                  {
                    action:
                      seed.status === MonthlyReportStatus.APPROVED
                        ? MonthlyReportTrailAction.APPROVED
                        : MonthlyReportTrailAction.RETURNED,
                    actor_name: reviewerName,
                    note: seed.decisionNote ?? null,
                    createdAt: decidedAt,
                  },
                ]
              : []),
          ],
        },
      },
      select: { monthly_report_id: true },
    });

    if (s3) {
      const files = [
        {
          name: `${seed.department}-Monthly-Report-${seed.period}.pdf`,
          buffer: buildPdf(seed.title, narrative(seed)),
        },
        ...(seed.annex
          ? [
              {
                name: seed.annex,
                buffer: buildPdf(seed.annex.replace(/\.pdf$/, ''), [
                  `Annex to ${reference}.`,
                  '',
                  'Supporting sheet kept with the submission for the reviewer.',
                ]),
              },
            ]
          : []),
      ];

      for (const file of files) {
        const key = `monthly-reports/${report.monthly_report_id}/${Date.now()}-${file.name}`;
        await s3.uploadToS3(key, file.buffer, 'application/pdf');

        await prisma.monthlyReportDocument.create({
          data: {
            monthly_report_id: report.monthly_report_id,
            file_name: file.name,
            kind: MonthlyReportDocumentKind.PDF,
            storage_key: key,
            content_type: 'application/pdf',
            byte_size: file.buffer.length,
            createdAt: submittedAt,
          },
        });
      }
    }

    console.log(`Seeded monthly report ${reference}: ${seed.title}`);
  }

  await seedFolder(prisma, director?.user_id ?? null, reviewerName);
};

/** Continues the `MR-YYYY-NNN` run rather than restarting it on a re-seed. */
const nextSequence = async (prisma: PrismaClient): Promise<number> => {
  const year = new Date().getFullYear();
  const latest = await prisma.monthlyReport.findFirst({
    where: { reference: { startsWith: `MR-${year}-` } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });

  if (!latest) return 1;

  const sequence = Number(latest.reference.split('-')[2]);
  return Number.isFinite(sequence) ? sequence + 1 : 1;
};

/** One director-made shelf, so the library opens with a folder that is not a college. */
const seedFolder = async (
  prisma: PrismaClient,
  createdByUserId: string | null,
  createdByName: string,
): Promise<void> => {
  const name = 'Accreditation Packet 2026';
  const existing = await prisma.monthlyReportFolder.findFirst({
    where: { name },
    select: { monthly_report_folder_id: true },
  });

  if (existing) {
    console.log(`Report folder already seeded: ${name}`);
    return;
  }

  const folder = await prisma.monthlyReportFolder.create({
    data: {
      name,
      created_by_user_id: createdByUserId,
      created_by_name: createdByName,
    },
    select: { monthly_report_folder_id: true },
  });

  // Approved reports only — the queue's own submissions are not filed anywhere yet.
  const filed = await prisma.monthlyReport.findMany({
    where: { status: MonthlyReportStatus.APPROVED, period: '2026-08' },
    select: { monthly_report_id: true },
    take: 2,
  });

  await prisma.monthlyReport.updateMany({
    where: {
      monthly_report_id: { in: filed.map((one) => one.monthly_report_id) },
    },
    data: { folder_id: folder.monthly_report_folder_id },
  });

  console.log(`Seeded report folder: ${name}`);
};
