import { Module } from "@nestjs/common";
import { SpeechController } from "./speech.controller";
import { SpeechService } from "./speech.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [SpeechController],
  providers: [SpeechService, AuthGuard, SupabaseService],
})
export class SpeechModule {}
