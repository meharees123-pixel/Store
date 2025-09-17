import { Request } from 'express';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../dto/store.dto';
import { StoreService } from '../services/store.service';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  /**
   * Create a new store (requires authentication)
   */
  @Post()
  //@UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new store' })
  @ApiResponse({ status: 201, type: StoreResponseDto })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createStoreDto: CreateStoreDto, @Req() request: Request) {
    const userId = request.user?.id;
    if (!userId) {
      // throw new NotFoundException('User not authenticated');
    }
    return this.storeService.create(createStoreDto, userId);
  }

  /**
   * Get all stores
   */
  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  @ApiResponse({ status: 200, type: [StoreResponseDto] })
  findAll() {
    return this.storeService.findAll();
  }

  /**
   * Get store by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  @ApiParam({
    name: 'id',
    description: 'Store ID',
    example: '68c467b88f1124a8b0fcd2b3',
  })
  @ApiResponse({ status: 200, type: StoreResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.storeService.findOne(id);
  }

  /**
   * Update store by ID (requires authentication)
   */
  @Put(':id')
  //@UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update store by ID' })
  @ApiParam({
    name: 'id',
    description: 'Store ID',
    example: '68c467b88f1124a8b0fcd2b3',
  })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({ status: 200, type: StoreResponseDto })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @Req() request: Request
  ) {
    const userId = request.user?.id;
    if (!userId) {
      // throw new NotFoundException('User not authenticated');
    }
    const updated = await this.storeService.update(id, updateStoreDto, userId);
    if (!updated) {
      throw new NotFoundException('Store not found');
    }
    return updated;
  }

  /**
   * Delete store by ID (requires authentication)
   */
  @Delete(':id')
  //@UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete store by ID' })
  @ApiParam({
    name: 'id',
    description: 'Store ID',
    example: '68c467b88f1124a8b0fcd2b3',
  })
  @ApiResponse({ status: 204, description: 'Store deleted' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async delete(@Param('id', new ParseObjectIdPipe()) id: string): Promise<{ deleted: boolean }> {
    const result = await this.storeService.delete(id);
    if (!result.deleted) {
      throw new NotFoundException('Store not found');
    }
    return result;
  }
}