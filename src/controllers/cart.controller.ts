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
  CreateCartDto,
  UpdateCartDto,
  CartResponseDto,
} from '../dto/cart.dto';
import { CartService } from '../services/cart.service';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('cart')
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, type: CartResponseDto })
  create(@Body() dto: CreateCartDto) {
    return this.cartService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cart items' })
  @ApiResponse({ status: 200, type: [CartResponseDto] })
  findAll() {
    return this.cartService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get cart items by user ID' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [CartResponseDto] })
  findByUser(@Param('userId', new ParseObjectIdPipe()) userId: string) {
    return this.cartService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cart item by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.cartService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cart item by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cart item by ID' })
  @ApiResponse({ status: 204, description: 'Cart item deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.cartService.delete(id);
  }
}