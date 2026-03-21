import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  CreateUserAddressDto,
  UpdateUserAddressDto,
  UserAddressResponseDto,
} from '../dto/user-address.dto';
import { UserAddressService } from '../services/user-address.service';
import { AuthGuard } from '../guards/auth.guard';

@UseGuards(AuthGuard)
@ApiTags('user-addresses')
@Controller('user-addresses')
export class UserAddressController {
  constructor(private readonly addressService: UserAddressService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user address' })
  @ApiResponse({ status: 201, type: UserAddressResponseDto })
  create(@Body() dto: CreateUserAddressDto) {
    return this.addressService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  @ApiResponse({ status: 200, type: [UserAddressResponseDto] })
  @ApiQuery({ name: 'storeId', required: false, description: 'Filter by store (optional)' })
  findAll(@Query('storeId') storeId?: string) {
    return this.addressService.findAll(storeId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get addresses by user ID' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Optional store filter' })
  @ApiResponse({ status: 200, type: [UserAddressResponseDto] })
  findByUser(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.addressService.findByUser(userId, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user address by ID' })
  @ApiResponse({ status: 200, type: UserAddressResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.addressService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user address by ID' })
  @ApiResponse({ status: 200, type: UserAddressResponseDto })
  update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.addressService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user address by ID' })
  @ApiResponse({ status: 204, description: 'User address deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.addressService.delete(id);
  }
}
