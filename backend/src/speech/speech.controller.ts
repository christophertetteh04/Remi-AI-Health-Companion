import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SpeechService } from "./speech.service";
import { AuthGuard } from "../auth/auth.guard";
import { TranscribeAudioDto } from "./dto/speech.dto";

@Controller("speech")
@UseGuards(AuthGuard)
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  // Expects a base64-encoded audio clip. Returns transcribed text
  // ONLY — the mobile app shows this in the input field for the user
  // to review and edit before it's ever sent as a message. See
  // ChatScreen.tsx: nothing here sends a message on the user's behalf.
  @Post("transcribe")
  async transcribe(@Body() body: TranscribeAudioDto) {
    return this.speechService.transcribe(body.audioBase64, body.mimeType);
  }

  @Post("transcribe-file")
  @UseInterceptors(FileInterceptor("file"))
  async transcribeFile(@UploadedFile() file: any) {
    return this.speechService.transcribeBuffer(file?.buffer, file?.mimetype);
  }
}
