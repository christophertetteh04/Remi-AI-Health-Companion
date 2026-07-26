import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { SpeechService } from "./speech.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("speech")
@UseGuards(AuthGuard)
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  // Expects a base64-encoded audio clip. Returns transcribed text
  // ONLY — the mobile app shows this in the input field for the user
  // to review and edit before it's ever sent as a message. See
  // ChatScreen.tsx: nothing here sends a message on the user's behalf.
  @Post("transcribe")
  async transcribe(@Body("audioBase64") audioBase64: string) {
    return this.speechService.transcribe(audioBase64);
  }
}
