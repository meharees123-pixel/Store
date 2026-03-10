import { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';

@ApiTags('users')
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', example: '68c467b88f1124a8b0fcd2b3' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.userService.getUserById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto, @Req() request: Request) {
    const userId = request.user?.id;
    return this.userService.createUser(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', example: '68c467b88f1124a8b0fcd2b3' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request,
  ) {
    const userId = request.user?.id;
    return this.userService.updateUser(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', example: '68c467b88f1124a8b0fcd2b3' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async delete(@Param('id', new ParseObjectIdPipe()) id: string): Promise<{ deleted: boolean }> {
    const result = await this.userService.deleteUser(id);
    if (!result.deleted) throw new NotFoundException('User not found');
    return result;
  }
}
