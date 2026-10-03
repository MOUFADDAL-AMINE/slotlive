import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailsService, SendEmailOptions } from './emails.service';

export const EMAIL_QUEUE = 'email-queue';

@Processor(EMAIL_QUEUE)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailsService: EmailsService) {
    super();
  }

  async process(job: Job<SendEmailOptions>): Promise<void> {
    this.logger.debug(`Processing email job: ${job.name} for ${job.data.to}`);
    await this.emailsService.sendEmail(job.data);
  }
}
