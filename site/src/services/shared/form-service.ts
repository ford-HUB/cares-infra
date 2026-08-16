export async function listGoogleForms() {
  return {
    success: true,
    data: [
      { id: 'f1', title: 'Volunteer Feedback Form', responses: 24 },
      { id: 'f2', title: 'Event Registration', responses: 56 },
    ],
  }
}
