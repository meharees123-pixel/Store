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
  CreateCartDto,
  UpdateCartDto,
  CartResponseDto,
  CartSummaryDto,
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
  @ApiOperation({ summary: 'Get cart summary for a specific user + store combination' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiQuery({ name: 'storeId', required: true, example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: CartSummaryDto })
  findByUser(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
    @Query('storeId', new ParseObjectIdPipe()) storeId: string,
  ) {
    return this.cartService.getCartSummary(userId, storeId);
  }

  @Get('user/:userId/store/:storeId')
  @ApiOperation({ summary: 'Get cart items by user ID and store ID' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: CartSummaryDto })
  findByUserStore(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
    @Param('storeId', new ParseObjectIdPipe()) storeId: string,
  ) {
    return this.cartService.getCartSummary(userId, storeId);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get cart items by store ID' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [CartResponseDto] })
  findByStore(@Param('storeId', new ParseObjectIdPipe()) storeId: string) {
    return this.cartService.findByStore(storeId);
  }

  @Put('user/:userId/store/:storeId/address')
  @ApiOperation({ summary: 'Update addressId for all cart items by userId + storeId' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: Object })
  updateAddressForUserStore(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
    @Param('storeId', new ParseObjectIdPipe()) storeId: string,
    @Body('userAddressId') userAddressId?: string,
    @Body('deliveryLocationId') deliveryLocationId?: string,
    @Body('addressId') addressId?: string,
  ) {
    return this.cartService.updateAddressForUserStore({
      userId,
      storeId,
      userAddressId,
      deliveryLocationId,
      addressId,
    });
  }

  @Get('count/user/:userId/store/:storeId')
  @ApiOperation({ summary: 'Get cart items count by userId + storeId' })
  @ApiParam({ name: 'userId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiParam({ name: 'storeId', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: Object })
  countByUserStore(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
    @Param('storeId', new ParseObjectIdPipe()) storeId: string,
  ) {
    return this.cartService.countByUserStore({ userId, storeId });
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

  @Put()
  @ApiOperation({
    summary:
      'Update cart item by userId + storeId + productId when cartId is not provided (quantity must be supplied)',
  })
  @ApiResponse({ status: 200, type: CartResponseDto })
  updateByKeys(@Body() dto: UpdateCartDto) {
    return this.cartService.update(undefined, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cart item by ID' })
  @ApiResponse({ status: 204, description: 'Cart item deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.cartService.delete(id);
  }
}
