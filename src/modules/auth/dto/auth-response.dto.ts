import { ApiProperty } from '@nestjs/swagger';
import { User } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user: User;

  @ApiProperty({ example: 'jwt_token_here' })
  access_token: string;
}
