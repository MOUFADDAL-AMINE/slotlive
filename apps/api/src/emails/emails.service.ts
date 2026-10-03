import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { generateIcsContent } from './ics.generator';
import { EmailStatus } from '@prisma/client';

export interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  html: string;
  icsAttachment?: {
    filename: string;
    summary: string;
    description: string;
    location: string;
    startAt: Date;
    endAt: Date;
  };
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendEmail(options: SendEmailOptions) {
    const from = this.configService.get<string>('SMTP_FROM', 'no-reply@slotlive.com');

    const attachments: any[] = [];

    if (options.icsAttachment) {
      const icsData = generateIcsContent({
        summary: options.icsAttachment.summary,
        description: options.icsAttachment.description,
        location: options.icsAttachment.location,
        startAt: options.icsAttachment.startAt,
        endAt: options.icsAttachment.endAt,
        organizerEmail: from,
      });

      attachments.push({
        filename: options.icsAttachment.filename || 'reservation.ics',
        content: icsData,
        contentType: 'text/calendar; method=REQUEST',
      });
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments,
      });

      await this.prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          template: options.templateName,
          status: EmailStatus.SENT,
        },
      });

      this.logger.log(`Email sent successfully to ${options.to} (${options.subject})`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}:`, err);

      await this.prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          template: options.templateName,
          status: EmailStatus.FAILED,
          errorMessage: err.message,
        },
      });

      throw err;
    }
  }
}
