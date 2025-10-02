import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { FirebaseLoginDto, FirebaseLogoutDto } from '../dto/user.dto';
import { User } from '../models/user.model';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('firebase-login')
  @ApiOperation({ summary: 'Login or register user via Firebase token' })
  @ApiResponse({ status: 200, type: User })
  firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.userService.firebaseLogin(dto);
  }

  @Post('firebase-logout')
  @ApiOperation({ summary: 'Logout user by clearing Firebase token' })
  @ApiResponse({ status: 200, type: Object })
  firebaseLogout(@Body() dto: FirebaseLogoutDto) {
    return this.userService.firebaseLogout(dto);
  }
}