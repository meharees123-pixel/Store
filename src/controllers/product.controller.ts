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
    UseInterceptors,
    UploadedFile,
    BadRequestException,
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
    ApiQuery,
    ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
    async findAll() {
        try {
            const products = await this.productService.findAll();
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new NotFoundException('Error fetching products');
        }
    }

    /**
     * Get products by store ID
     */
    @Get('store/:storeId')
    @ApiOperation({ summary: 'Get products by store ID' })
    @ApiParam({ name: 'storeId', example: '652f1c2d9e4b1a2a3c1d2e3f4' })
    @ApiResponse({ status: 200, type: [ProductResponseDto] })
    findByStore(@Param('storeId', new ParseObjectIdPipe()) storeId: string) {
        return this.productService.findByStoreId(storeId);
    }

    /**
     * Global product search (name/description/etc.)
     */
    @Get('search')
    @ApiOperation({ summary: 'Search products by query' })
    @ApiQuery({ name: 'q', required: true, example: 'apple' })
    @ApiQuery({ name: 'storeId', required: false, example: '652f1c2d9e4b1a2a3c1d2e3f4' })
    @ApiQuery({ name: 'limit', required: false, example: 25 })
    @ApiQuery({ name: 'skip', required: false, example: 0 })
    @ApiResponse({ status: 200, type: [ProductResponseDto] })
    search(
        @Query('q') q: string,
        @Query('storeId') storeId?: string,
        @Query('limit') limit?: string,
        @Query('skip') skip?: string,
    ) {
        const limitNum = limit !== undefined ? parseInt(String(limit), 10) : undefined;
        const skipNum = skip !== undefined ? parseInt(String(skip), 10) : undefined;

        return this.productService.search({
            q,
            storeId,
            limit: Number.isFinite(limitNum as any) ? (limitNum as number) : undefined,
            skip: Number.isFinite(skipNum as any) ? (skipNum as number) : undefined,
        });
    }

    /**
     * Get products by category OR subcategory ID
     */
    @Get('by-parent/:id')
    @ApiOperation({ summary: 'Get products by category OR subcategory ID' })
    @ApiParam({
        name: 'id',
        description: 'Category ID or Subcategory ID',
        example: '68c467b88f1124a8b0fcd2b3', // ðŸ” MongoDB ObjectId format
    })
    @ApiResponse({ status: 200, type: [ProductResponseDto] })
    async findByParentId(@Param('id', new ParseObjectIdPipe()) id: string) {
        const products = await this.productService.findByParentId(id);
        if (!products.length) {
            throw new NotFoundException('No products found for the provided category/subcategory id');
        }
        return products;
    }

    /**
     * Get a product by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, type: ProductResponseDto })
    async findOne(@Param('id', new ParseObjectIdPipe()) id: string) {
        const product = await this.productService.findOne(id);
        if (!product) throw new NotFoundException('Product not found');
        return product;
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
        example: '68c467b88f1124a8b0fcd2b3', // ðŸ” MongoDB ObjectId format
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
        example: '68c467b88f1124a8b0fcd2b3', // ðŸ” MongoDB ObjectId format
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

    @Post(':id/image')
    @ApiOperation({ summary: 'Upload product image' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: { type: 'string', format: 'binary' },
            },
            required: ['image'],
        },
    })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype?.startsWith('image/')) {
                    return cb(new BadRequestException('Only image files are allowed') as any, false);
                }
                cb(null, true);
            },
        }),
    )
    uploadImage(
        @Param('id', new ParseObjectIdPipe()) id: string,
        @UploadedFile() file: any,
        @Req() request: Request,
    ) {
        const userId = request.user?.id;
        return this.productService.uploadProductImage({ id, file, userId });
    }

    @Put(':id/image')
    @ApiOperation({ summary: 'Replace product image' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: { type: 'string', format: 'binary' },
            },
            required: ['image'],
        },
    })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype?.startsWith('image/')) {
                    return cb(new BadRequestException('Only image files are allowed') as any, false);
                }
                cb(null, true);
            },
        }),
    )
    replaceImage(
        @Param('id', new ParseObjectIdPipe()) id: string,
        @UploadedFile() file: any,
        @Req() request: Request,
    ) {
        const userId = request.user?.id;
        return this.productService.uploadProductImage({ id, file, userId });
    }

    @Delete(':id/image')
    @ApiOperation({ summary: 'Delete product image' })
    @ApiResponse({ status: 200, type: ProductResponseDto })
    deleteImage(
        @Param('id', new ParseObjectIdPipe()) id: string,
        @Req() request: Request,
    ) {
        const userId = request.user?.id;
        return this.productService.deleteProductImage({ id, userId });
    }
}
