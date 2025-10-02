import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  CreateAppSettingsDto,
  UpdateAppSettingsDto,
  AppSettingsResponseDto,
} from '../dto/app-settings.dto';
import { AppSettingsService } from '../services/app-settings.service';
import { AuthGuard } from 'src/guards/auth.guard';

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
  @ApiResponse({ status: 200, type: [AppSettingsResponseDto] })
  findAll() {
    return this.appSettingsService.findAll();
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