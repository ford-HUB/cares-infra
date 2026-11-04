import campusDirector from '../assets/landing_page/org/chart-2025/campus-director.jpg'
import businessAsst from '../assets/landing_page/org/chart-portraits/business-asst.jpg'
import computerStudiesAsst from '../assets/landing_page/org/chart-portraits/computer-studies-asst.jpg'
import criminologyAsst from '../assets/landing_page/org/chart-portraits/criminology-asst.jpg'
import criminology from '../assets/landing_page/org/chart-portraits/criminology.jpg'
import customsAsst from '../assets/landing_page/org/chart-portraits/customs-asst.jpg'
import engineeringAsst from '../assets/landing_page/org/chart-portraits/engineering-asst.jpg'
import gradeSchoolAsst from '../assets/landing_page/org/chart-portraits/grade-school-asst.jpg'
import hospitality from '../assets/landing_page/org/chart-portraits/hospitality.jpg'
import juniorHighAsst from '../assets/landing_page/org/chart-portraits/junior-high-asst.jpg'
import nonTeachingAsst from '../assets/landing_page/org/chart-portraits/non-teaching-asst.jpg'
import nursingAsst from '../assets/landing_page/org/chart-portraits/nursing-asst.jpg'
import seniorHigh from '../assets/landing_page/org/chart-portraits/senior-high.jpg'
import teacherEdAsst from '../assets/landing_page/org/chart-portraits/teacher-ed-asst.jpg'
import teacherEdBeed from '../assets/landing_page/org/chart-portraits/teacher-ed-beed.jpg'
import teacherEdBsed from '../assets/landing_page/org/chart-portraits/teacher-ed-bsed.jpg'
import tourism from '../assets/landing_page/org/chart-portraits/tourism.jpg'
import montebon from '../assets/landing_page/org/montebon.jpg'
import monton from '../assets/landing_page/org/monton.jpg'

/** UCLM CARES organizational chart, following the office's chart updated as of
 *  August 1, 2025. Static content — nothing here is fetched.
 *
 *  `name` is left out wherever the chart gives no caption: the card then shows the
 *  position alone, rather than a guess at someone's name. */

/** The office's full-size portraits, served from `public/`. */
const profilePhoto = (file: number) => `/organization-profiles/${file}.png`

export interface LandingOrgPerson {
  name: string
  role: string
  photo: string
}

export interface LandingOrgMember {
  name?: string
  title: string
  /** Left out where the chart itself only has a placeholder picture. */
  photo?: string
  assistant?: boolean
}

export interface LandingOrgUnit {
  department: string
  members: readonly LandingOrgMember[]
}

export const LANDING_ORG_CAMPUS_DIRECTOR: LandingOrgPerson = {
  name: 'Dr. Anna Liza B. Son',
  role: 'UCLM Campus Affairs Director',
  photo: campusDirector,
}

export const LANDING_ORG_CARES_DIRECTOR: LandingOrgPerson = {
  name: 'Dr. Richie L. Montebon',
  role: 'UCLM CARES Director',
  photo: montebon,
}

export const LANDING_ORG_CARES_STAFF: LandingOrgPerson = {
  name: 'Mr. Melvin T. Monton',
  role: 'CARES Staff',
  photo: monton,
}

/** Groups the chart draws as labelled boxes rather than named people. */
export const LANDING_ORG_GROUPS = {
  faculty: 'Instructors & Professors',
  students: 'Students, Volunteers & the CARES Student Organization',
} as const

const COORDINATOR = 'Coordinator'
const ASSISTANT = 'Assistant Coordinator'

export const LANDING_ORG_UNITS: readonly LandingOrgUnit[] = [
  {
    department: 'Grade School',
    members: [
      { name: 'Ms. Lalaine B. Abing', title: COORDINATOR, photo: profilePhoto(13) },
      { title: ASSISTANT, photo: gradeSchoolAsst, assistant: true },
    ],
  },
  {
    department: 'Junior High School',
    members: [
      { name: 'Ms. Janine Caseylyn D. Cantago', title: COORDINATOR, photo: profilePhoto(4) },
      { title: ASSISTANT, photo: juniorHighAsst, assistant: true },
    ],
  },
  {
    department: 'Senior High School',
    members: [{ name: 'Merry Rose A. Candar', title: COORDINATOR, photo: seniorHigh }],
  },
  {
    department: 'Teacher Education',
    members: [
      { name: 'Ms. Carine Abella-Batucan', title: 'BSEd', photo: teacherEdBsed },
      { name: 'Ms. Rhania Jade Pinili', title: 'BEEd', photo: teacherEdBeed },
      { name: 'Mr. Ian Rey Empedrado', title: ASSISTANT, photo: teacherEdAsst, assistant: true },
    ],
  },
  {
    department: 'Business and Accountancy',
    members: [
      { name: 'Mr. Ernesto Bais', title: COORDINATOR, photo: profilePhoto(10) },
      { name: 'Mr. Mark Joseph Pueblas', title: ASSISTANT, photo: businessAsst, assistant: true },
    ],
  },
  {
    department: 'Customs Administration',
    members: [
      { name: 'Ms. Christy Miñoza', title: COORDINATOR, photo: profilePhoto(7) },
      { name: 'Ms. Rhea Bacang', title: ASSISTANT, photo: customsAsst, assistant: true },
    ],
  },
  {
    department: 'Computer Studies',
    members: [
      { name: 'Ms. Jesieca C. Reyes', title: COORDINATOR, photo: profilePhoto(6) },
      { name: 'Ms. Christine Gepiga', title: ASSISTANT, photo: computerStudiesAsst, assistant: true },
    ],
  },
  {
    department: 'Criminology',
    members: [
      { name: 'Mr. Mark Cantillep', title: COORDINATOR, photo: criminology },
      { name: 'Ms. Karen Abegail Cuizon', title: ASSISTANT, photo: criminologyAsst, assistant: true },
    ],
  },
  {
    department: 'Engineering',
    members: [
      { name: 'Engr. Jean Careen M. Engkong', title: COORDINATOR, photo: profilePhoto(3) },
      { name: 'Engr. Marvin Bubuli', title: ASSISTANT, photo: engineeringAsst, assistant: true },
    ],
  },
  {
    department: 'Hospitality Management',
    members: [{ name: 'Dr. Regie Gabunada', title: COORDINATOR, photo: hospitality }],
  },
  {
    department: 'Tourism Management',
    members: [{ name: 'Ms. Irene Marie Osorno', title: COORDINATOR, photo: tourism }],
  },
  {
    department: 'Nursing',
    members: [
      { name: 'Ms. Rose Delia P. Ocariza', title: COORDINATOR, photo: profilePhoto(12) },
      { name: 'Ms. Lutgarda Carabio', title: ASSISTANT, photo: nursingAsst, assistant: true },
    ],
  },
  {
    department: 'Marine Engineering',
    members: [{ name: 'Engr. Balir Briones', title: COORDINATOR, photo: profilePhoto(17) }],
  },
  {
    department: 'Marine Transportation',
    members: [{ name: 'Capt. Ian Faller', title: COORDINATOR, photo: profilePhoto(1) }],
  },
  {
    department: 'Non-Teaching Division',
    members: [
      { name: 'Ms. Kimberlaine T. Endorte', title: COORDINATOR, photo: profilePhoto(2) },
      { name: 'Ms. Apple Ermonda', title: ASSISTANT, photo: nonTeachingAsst, assistant: true },
    ],
  },
] as const
