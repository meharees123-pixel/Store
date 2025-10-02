import { Request } from 'express';
import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    UseGuards,
    NotFoundException,
    Query,
    Req,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiParam,
    ApiBody,
    ApiHeader,
    ApiBearerAuth,
} from '@nestjs/swagger';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductResponseDto,
} from '../dto/product.dto';
import { ProductService } from '../services/product.service';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('products')
@UseGuards(AuthGuard)
@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    /**
     * Create a new product (requires authentication)
     */
    @Post()
    //@UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, type: ProductResponseDto })
    @ApiBody({ type: CreateProductDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    create(
        @Body() createProductDto: CreateProductDto,
        @Req() request: Request
    ) {
        const userId = request.user?.id;
        if (!userId) {
           // throw new NotFoundException('User not authenticated');
        }
        return this.productService.create(createProductDto, userId);
    }

    /**
     * Get all products
     */
    @Get()
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ status: 200, type: [ProductResponseDto] })
    findAll() {
        return this.productService.findAll();
    }

    /**
     * Get products by category ID
     */
    @Get(':categoryId')
    @ApiOperation({ summary: 'Get products by category ID' })
    @ApiParam({
        name: 'categoryId',
        description: 'Parent category ID',
        example: '68c467b88f1124a8b0fcd2b3', // 🔁 MongoDB ObjectId format
    })
    @ApiResponse({ status: 200, type: [ProductResponseDto] })
    findByCategoryId(@Param('categoryId') categoryId: string) {
        return this.productService.findByCategoryId(categoryId);
    }

    /**
     * Get a product by ID
     */

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, type: ProductResponseDto })
    findOne(@Param('id') id: string) {
        return this.productService.findOne(id);
    }

    /**
     * Update a product by ID (requires authentication)
     */
    @Put(':id')
    //@UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Update a product by ID' })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: '68c467b88f1124a8b0fcd2b3', // 🔁 MongoDB ObjectId format
    })
    @ApiBody({ type: UpdateProductDto })
    @ApiResponse({ status: 200, type: ProductResponseDto })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async update(
        @Param('id', new ParseObjectIdPipe()) id: string,
        @Body() updateProductDto: UpdateProductDto,
        @Req() request: Request
    ) {
        const userId = request.user?.id;
        if (!userId) {
          //  throw new NotFoundException('User not authenticated');
        }
        const updated = await this.productService.update(id, updateProductDto, userId);
        if (!updated) {
            throw new NotFoundException('Product not found');
        }
        return updated;
    }

    /**
     * Delete a product by ID (requires authentication)
     */
    @Delete(':id')
    //@UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Delete a product by ID' })
    @ApiParam({
        name: 'id',
        description: 'Product ID',
        example: '68c467b88f1124a8b0fcd2b3', // 🔁 MongoDB ObjectId format
    })
    @ApiResponse({ status: 204, description: 'Product deleted' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async delete(
        @Param('id', new ParseObjectIdPipe()) id: string
    ): Promise<{ deleted: boolean }> {
        const result = await this.productService.delete(id);
        if (!result.deleted) {
            throw new NotFoundException('Product not found');
        }
        return result;
    }
}