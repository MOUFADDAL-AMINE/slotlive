import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailsService } from './emails.service';
import { EmailProcessor, EMAIL_QUEUE } from './email.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [EmailsService, EmailProcessor],
  exports: [EmailsService, BullModule],
})
export class EmailsModule {}
