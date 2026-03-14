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
  CreateOrderDto,
  UpdateOrderDto,
  OrderResponseDto,
} from '../dto/order.dto';
import { OrderService } from '../services/order.service';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('orders')
@UseGuards(AuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Submit order from cart items' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  findAll() {
    return this.orderService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get orders by user ID' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  findByUser(@Param('userId', new ParseObjectIdPipe()) userId: string) {
    return this.orderService.findByUser(userId);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get orders by store ID' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  findByStore(@Param('storeId', new ParseObjectIdPipe()) storeId: string) {
    return this.orderService.findByStore(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.orderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update order status or address' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orderService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by ID' })
  @ApiResponse({ status: 204, description: 'Order deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.orderService.delete(id);
  }
}
