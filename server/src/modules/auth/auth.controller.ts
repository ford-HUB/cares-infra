import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type UploadedFile = {
  fieldname: string;
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(AnyFilesInterceptor())
  register(@Body() dto: RegisterDto, @UploadedFiles() files: UploadedFile[]) {
    return this.authService.register(dto, files);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
