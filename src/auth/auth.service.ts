import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;
const REMEMBER_ME_EXPIRES_IN = '30d';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; role: string; name: string };
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async login(email: string, password: string, rememberMe?: boolean, turnstileToken?: string): Promise<AuthResult> {
    await this.verifyTurnstile(turnstileToken);

    const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueToken(user, rememberMe ? REMEMBER_ME_EXPIRES_IN : undefined);
  }

  /** No-ops when TURNSTILE_SECRET_KEY isn't configured, so local dev works without a Cloudflare account. */
  private async verifyTurnstile(token?: string): Promise<void> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) return;

    if (!token) throw new BadRequestException('Please complete the verification challenge.');

    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const result = (await res.json()) as { success: boolean };
    if (!result.success) throw new BadRequestException('Verification failed — please try again.');
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const user = this.users.create({
      role: 'general',
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      status: 'active',
      registrationSource: 'self',
    });
    const saved = await this.users.save(user);
    return this.issueToken(saved);
  }

  async loginWithGoogle(idToken: string, allowCreate: boolean): Promise<AuthResult> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new UnauthorizedException('Google sign-in is not configured on this server.');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google sign-in token.');
    }

    if (!payload?.email) throw new UnauthorizedException('Your Google account has no verified email.');

    return this.findOrCreateSsoUser(payload.email, payload.given_name ?? 'Member', payload.family_name ?? '', allowCreate, 'google');
  }

  async loginWithFacebook(accessToken: string, allowCreate: boolean): Promise<AuthResult> {
    let data: { email?: string; first_name?: string; last_name?: string };
    try {
      const res = await fetch(
        `https://graph.facebook.com/me?fields=first_name,last_name,email&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) throw new Error('Facebook rejected the access token.');
      data = (await res.json()) as typeof data;
    } catch {
      throw new UnauthorizedException('Invalid Facebook sign-in token.');
    }

    if (!data.email) {
      throw new UnauthorizedException('Your Facebook account has no verified email. Please use Google or email/password instead.');
    }

    return this.findOrCreateSsoUser(data.email, data.first_name ?? 'Member', data.last_name ?? '', allowCreate, 'facebook');
  }

  private async findOrCreateSsoUser(
    email: string,
    firstName: string,
    lastName: string,
    allowCreate: boolean,
    source: 'google' | 'facebook',
  ): Promise<AuthResult> {
    const normalized = email.toLowerCase().trim();
    let user = await this.users.findOne({ where: { email: normalized } });

    if (!user) {
      if (!allowCreate) {
        throw new UnauthorizedException('No account is registered with this email yet. Please create an account first.');
      }

      const unusablePasswordHash = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
      user = this.users.create({
        role: 'general',
        firstName,
        lastName,
        email: normalized,
        passwordHash: unusablePasswordHash,
        status: 'active',
        registrationSource: source,
        emailVerifiedAt: new Date(),
      });
      user = await this.users.save(user);
    }

    if (user.status !== 'active') throw new UnauthorizedException('This account is not active.');

    return this.issueToken(user);
  }

  private async issueToken(user: User, expiresIn?: JwtSignOptions['expiresIn']): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      expiresIn ? { expiresIn } : undefined,
    );
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`.trim(),
      },
    };
  }
}
