export async function listAttendanceRecords() {
  return {
    success: true,
    data: [
      { id: 'a1', event: 'Community Clean-Up', date: '2026-06-28', present: 42 },
      { id: 'a2', event: 'Medical Outreach', date: '2026-06-20', present: 18 },
    ],
  }
}
