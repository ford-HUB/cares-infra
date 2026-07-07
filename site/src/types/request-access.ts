export interface SubmitRequestAccessPayload {
  fromEmail: string
  toEmail: string
  subject: string
  body: string
  attachments: File[]
}

export interface FileValidationResult {
  valid: boolean
  message?: string
}
