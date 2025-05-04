import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { instanceToPlain } from 'class-transformer';
import { User } from '@modules/users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // auth logic, just checks creds and return token + user
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);
    
    // either user doesn't exist or wrong pass
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.generateToken(user.id),
      user: this.sanitizeUser(user),
    };
  }

  // create new user and return jwt right away
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // NOTE: duplicate email check already handled in usersService.create()
    const user = await this.usersService.create(registerDto);

    return {
      access_token: this.generateToken(user.id),
      user: this.sanitizeUser(user),
    };
  }

  // generates jwt token, just packs userId as sub
  private generateToken(userId: string) {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  // strips out sensitive stuff like password
  private sanitizeUser(user: any): User {
    return instanceToPlain(user) as User;
  }

  // used by jwt guard probably
  async validateUser(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);
    return user || null; // if no user, guard should block it
  }

  // stubbed for now, maybe useful later when we have roles feature
  async validateUserRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    return true; // to be implemented properly later
  }
}
