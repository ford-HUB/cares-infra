export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  /** Where a human reply should land — the sender is always the configured mail account. */
  replyTo?: string;
  attachments?: MailAttachment[];
}
