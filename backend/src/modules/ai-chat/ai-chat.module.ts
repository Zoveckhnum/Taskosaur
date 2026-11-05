import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CodexCliService } from './codex-cli.service';

@Module({
  imports: [SettingsModule, PrismaModule],
  controllers: [AiChatController],
  providers: [AiChatService, CodexCliService],
  exports: [AiChatService],
})
export class AiChatModule {}
