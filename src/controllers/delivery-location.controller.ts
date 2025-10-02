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
  CreateDeliveryLocationDto,
  UpdateDeliveryLocationDto,
  DeliveryLocationResponseDto,
} from '../dto/delivery-location.dto';
import { DeliveryLocationService } from '../services/delivery-location.service';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('delivery-locations')
@UseGuards(AuthGuard)
@Controller('delivery-locations')
export class DeliveryLocationController {
  constructor(private readonly locationService: DeliveryLocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery location' })
  @ApiResponse({ status: 201, type: DeliveryLocationResponseDto })
  create(@Body() createDto: CreateDeliveryLocationDto) {
    return this.locationService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all delivery locations' })
  @ApiResponse({ status: 200, type: [DeliveryLocationResponseDto] })
  findAll() {
    return this.locationService.findAll();
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get delivery locations by store ID' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [DeliveryLocationResponseDto] })
  findByStore(@Param('storeId', new ParseObjectIdPipe()) storeId: string) {
    return this.locationService.findByStore(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery location by ID' })
  @ApiResponse({ status: 200, type: DeliveryLocationResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.locationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update delivery location by ID' })
  @ApiResponse({ status: 200, type: DeliveryLocationResponseDto })
  update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() updateDto: UpdateDeliveryLocationDto,
  ) {
    return this.locationService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery location by ID' })
  @ApiResponse({ status: 204, description: 'Delivery location deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.locationService.delete(id);
  }
}