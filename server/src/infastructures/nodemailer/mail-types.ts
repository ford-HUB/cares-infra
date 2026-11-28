export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  /** The sender is always the configured mail account. */
  replyTo?: string;
  attachments?: MailAttachment[];
}
