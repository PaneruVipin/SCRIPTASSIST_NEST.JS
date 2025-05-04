import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from './dto/user-response.dto';
import { GetUsersQueryDto } from './dto/get-user.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { SuccessResponseDto } from '@common/dto/action-successfull.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // this just adds a new user, but first check if email already taken
  async create(createUserDto: CreateUserDto): Promise<User> {
    const exists = await this.findByEmail(createUserDto.email);
    if (exists) {
      throw new BadRequestException('email already used');
    }

    // hash password if it's there (some users might not have one in edge cases)
    if (createUserDto.password) {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user); // save to db
  }

  async findAll(options: GetUsersQueryDto) {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      role,
      search,
    } = options;
  
    const query = this.usersRepository.createQueryBuilder('user');
  
    if (role) {
      query.andWhere('user.role = :role', { role });
    }
  
    if (search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }
  
    query.orderBy(`user.${sortBy}`, sortOrder);
    query.skip((page - 1) * limit).take(limit);
  
    const [data, total] = await query.getManyAndCount();
  
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  

  // find by id, if not found just return null
  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // same as findOne but throws if not found, useful for strict stuff
  async findOneOrFail(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return user;
  }

  // just lookup user by email, usual use in login or duplicate check
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // update user, also make sure updated email not already used by someone else
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOneOrFail(id);

    // if user is changing their email, make sure it's not taken
    if (
      updateUserDto.email &&
      updateUserDto.email !== user.email
    ) {
      const existing = await this.findByEmail(updateUserDto.email);
      if (existing) {
        throw new BadRequestException('this email already in use');
      }
    }

    // again, if password is changed, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // copy new data to old user
    this.usersRepository.merge(user, updateUserDto);
    return this.usersRepository.save(user); // save again
  }

  // delete user by id, don't load full user from db just for deletion
  async remove(id: string):Promise<SuccessResponseDto> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('no user found to delete');
    }
    return { success:true, message: "deleted" }
  }
}
