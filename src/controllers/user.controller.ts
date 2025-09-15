import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UserDto } from '../dto/user.dto';
import { User } from '../models/user.model';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ValidationPipe } from '../utils/validation.pipe';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create User' })
  @ApiResponse({ status: 201, description: 'Returns created user', type: User })
  @Post()
  async createUser(@Body(new ValidationPipe()) userDto: UserDto): Promise<User> {
    return this.userService.createUser(userDto);
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Creates a new user', type: User })
  @Get()
  async findAllUsers(): Promise<User[]> {
    return this.userService.findAllUsers();
  }
}