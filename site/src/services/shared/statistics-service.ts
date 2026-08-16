export async function getPortalStatistics() {
  return {
    success: true,
    data: {
      totalVolunteers: 1280,
      activeEvents: 14,
      donationsThisMonth: 45200,
      programsCompleted: 87,
    },
  }
}
