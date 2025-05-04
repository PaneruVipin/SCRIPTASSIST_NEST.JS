
import { UsersService } from '@modules/users/users.service';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
      constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
      ) {}
      async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
      
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedException('Missing or invalid token');
        }
      
        const token = authHeader.split(' ')[1];
      
        try {
          const payload = this.jwtService.verify(token);
          const user = await this.usersService.findOneOrFail(payload?.sub);
          request.user = user;
          return true;
        } catch (error) {
          throw new UnauthorizedException('Invalid or expired token');
        }
      }
      
}
