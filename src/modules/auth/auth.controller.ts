import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '@common/guards/roles.guard';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorResponseDto } from '@common/dto/http-error-response.dto';
import { ApiErrorResponse } from '@common/decorators/api-error-response.decorator';

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
@RateLimit({ limit: 50, windowMs: 60000 })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiResponse({
    status: 200,
    description: 'Successful login',
    type: AuthResponseDto,
  })
  @ApiErrorResponse({   // custom decrator for documet error because of common error structer
    status: 401,
    message: 'Invalid credentials',
    description: 'Email or password is incorrect',
    path: '/auth/login',
  })
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiErrorResponse({
    status: 400,
    message: 'Validation failed',
    description: 'Missing or invalid registration data',
    path: '/auth/register',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
