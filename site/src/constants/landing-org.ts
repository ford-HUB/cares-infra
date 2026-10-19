import abing from '../assets/landing_page/org/abing.jpg'
import cantago from '../assets/landing_page/org/cantago.jpg'
import colonia from '../assets/landing_page/org/colonia.jpg'
import cosido from '../assets/landing_page/org/cosido.jpg'
import endorte from '../assets/landing_page/org/endorte.jpg'
import engkong from '../assets/landing_page/org/engkong.jpg'
import garma from '../assets/landing_page/org/garma.jpg'
import mana from '../assets/landing_page/org/mana.jpg'
import montebon from '../assets/landing_page/org/montebon.jpg'
import monton from '../assets/landing_page/org/monton.jpg'
import navarro from '../assets/landing_page/org/navarro.jpg'
import niepes from '../assets/landing_page/org/niepes.jpg'
import ocariza from '../assets/landing_page/org/ocariza.jpg'
import pangatungan from '../assets/landing_page/org/pangatungan.jpg'
import pinatil from '../assets/landing_page/org/pinatil.jpg'
import reyes from '../assets/landing_page/org/reyes.jpg'
import tandog from '../assets/landing_page/org/tandog.jpg'
import taoc from '../assets/landing_page/org/taoc.jpg'

/** UCLM CARES organizational chart. Structure follows the bulletin's chart
 *  (updated January 2024); names and coordinators follow the 2024–2025 personnel
 *  page. Static content — nothing here is fetched. */

export interface LandingOrgPerson {
  name: string
  role: string
  photo: string
}

export const LANDING_ORG_SOURCE = 'Structure as of January 2024 · personnel as of SY 2024–2025'

export const LANDING_ORG_CAMPUS_DIRECTOR: LandingOrgPerson = {
  name: 'Dean Ofelia Maña',
  role: 'UCLM Campus Affairs Director',
  photo: mana,
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

export const LANDING_ORG_COORDINATORS: readonly LandingOrgPerson[] = [
  {
    name: 'Ms. Lalaine B. Abing',
    role: 'Grade School Department',
    photo: abing,
  },
  {
    name: 'Ms. Janine Caseylyn D. Cantago',
    role: 'Junior High School Department',
    photo: cantago,
  },
  {
    name: 'Mr. Alfie Tandog',
    role: 'Senior High School Department',
    photo: tandog,
  },
  {
    name: 'Mr. Gendolf L. Niepes',
    role: 'Teacher Education (BSEd)',
    photo: niepes,
  },
  {
    name: 'Mr. Vernel A. Garma',
    role: 'Teacher Education (BEEd)',
    photo: garma,
  },
  {
    name: 'Mr. June Ace P. Navarro',
    role: 'Business and Accountancy',
    photo: navarro,
  },
  { name: 'Mr. Kent P. Cosido', role: 'Customs Administration', photo: cosido },
  { name: 'Ms. Jesieca C. Reyes', role: 'Computer Studies', photo: reyes },
  { name: 'Ms. Grace E. Colonia', role: 'Criminology', photo: colonia },
  { name: 'Ms. Jean Careen M. Engkong', role: 'Engineering', photo: engkong },
  {
    name: 'Ms. Margarette A. Taoc',
    role: 'Hospitality and Tourism Management',
    photo: taoc,
  },
  { name: 'Ms. Rose Delia P. Ocariza', role: 'Nursing', photo: ocariza },
  {
    name: 'Mr. Mel-Timothy C. Pinatil',
    role: 'Marine Engineering',
    photo: pinatil,
  },
  {
    name: 'Capt. Arnel Pangatungan',
    role: 'Marine Transportation',
    photo: pangatungan,
  },
  {
    name: 'Ms. Kimberlaine T. Endorte',
    role: 'Non-Teaching Division',
    photo: endorte,
  },
] as const
