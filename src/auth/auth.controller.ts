import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password, returns a JWT access token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiOperation({ summary: 'Create a new self-service account (always role=general) and log in.' })
  @ApiConflictResponse({ description: 'An account with this email already exists.' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('google')
  @ApiOperation({ summary: 'Sign in (or create an account) via a verified Google ID token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or unconfigured Google sign-in.' })
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken, dto.allowCreate ?? false);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('facebook')
  @ApiOperation({ summary: 'Sign in (or create an account) via a Facebook user access token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid Facebook access token.' })
  loginWithFacebook(@Body() dto: FacebookLoginDto) {
    return this.auth.loginWithFacebook(dto.accessToken, dto.allowCreate ?? false);
  }
}
