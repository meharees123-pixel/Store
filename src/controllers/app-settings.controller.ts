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
  BadRequestException,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  CreateAppSettingsDto,
  UpdateAppSettingsDto,
  AppSettingsResponseDto,
} from '../dto/app-settings.dto';
import { AppSettingsService } from '../services/app-settings.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { Types } from 'mongoose';

@ApiTags('app-settings')
@UseGuards(AuthGuard)
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new app setting' })
  @ApiResponse({ status: 201, type: AppSettingsResponseDto })
  create(@Body() dto: CreateAppSettingsDto) {
    return this.appSettingsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all app settings' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Optional store scope (omit for global + all settings)' })
  @ApiResponse({ status: 200, type: [AppSettingsResponseDto] })
  findAll(@Query('storeId') storeId?: string) {
    if (storeId) {
      const trimmed = String(storeId).trim();
      if (!Types.ObjectId.isValid(trimmed)) {
        throw new BadRequestException(`Invalid MongoDB ObjectId: ${trimmed}`);
      }
      return this.appSettingsService.findAllByStore(trimmed);
    }

    return this.appSettingsService.findAll();
  }

  @Get('value')
  @ApiOperation({ summary: 'Get a single setting value by key (with optional store scope)' })
  @ApiQuery({ name: 'key', required: true, description: 'Setting key to look up' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Optional store ID to scope the result' })
  @ApiResponse({ status: 200, schema: { properties: { value: { type: 'string', nullable: true } } } })
  async findValue(
    @Query('key') key?: string,
    @Query('storeId') storeId?: string,
  ) {
    const trimmedKey = String(key || '').trim();
    if (!trimmedKey) {
      throw new BadRequestException('Key is required');
    }

    const value = await this.appSettingsService.findByKeyWithFallback({
      key: trimmedKey,
      storeId: storeId ? String(storeId).trim() : undefined,
    });

    return { value: value?.value ?? null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get app setting by ID' })
  @ApiResponse({ status: 200, type: AppSettingsResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.appSettingsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update app setting by ID' })
  @ApiResponse({ status: 200, type: AppSettingsResponseDto })
  update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() dto: UpdateAppSettingsDto,
  ) {
    return this.appSettingsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete app setting by ID' })
  @ApiResponse({ status: 204, description: 'App setting deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.appSettingsService.delete(id);
  }
}
