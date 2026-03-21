import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from '../dto/category.dto';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';
import { DashboardProductCategoryDto } from 'src/dto/product.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('categories')
@UseGuards(AuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService,
    private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get categories by store ID' })
  @ApiParam({ name: 'storeId', example: '652f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  findByStore(@Param('storeId', new ParseObjectIdPipe()) storeId: string) {
    return this.categoryService.findByStoreId(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category by ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category by ID' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  delete(@Param('id', new ParseObjectIdPipe()) id: string) {
    return this.categoryService.delete(id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload category image' })
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
    return this.categoryService.uploadCategoryImage({ id, file, userId });
  }

  @Put(':id/image')
  @ApiOperation({ summary: 'Replace category image' })
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
    return this.categoryService.uploadCategoryImage({ id, file, userId });
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Delete category image' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  deleteImage(@Param('id', new ParseObjectIdPipe()) id: string, @Req() request: Request) {
    const userId = request.user?.id;
    return this.categoryService.deleteCategoryImage({ id, userId });
  }

  @Post(':id/icon')
  @ApiOperation({ summary: 'Upload category icon image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
      required: ['icon'],
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
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
  uploadIcon(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    const userId = request.user?.id;
    return this.categoryService.uploadCategoryIcon({ id, file, userId });
  }

  @Put(':id/icon')
  @ApiOperation({ summary: 'Replace category icon image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
      required: ['icon'],
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
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
  replaceIcon(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    const userId = request.user?.id;
    return this.categoryService.uploadCategoryIcon({ id, file, userId });
  }

  @Delete(':id/icon')
  @ApiOperation({ summary: 'Delete category icon image' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  deleteIcon(@Param('id', new ParseObjectIdPipe()) id: string, @Req() request: Request) {
    const userId = request.user?.id;
    return this.categoryService.deleteCategoryIcon({ id, userId });
  }

  @Get('dashboard-categories/:storeId')
  @ApiOperation({ summary: 'Get dashboard categories based on app settings' })
  @ApiParam({ name: 'storeId', example: '652f1c2d9e4b1a2a3c1d2e3f4' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  @ApiQuery({ name: 'debug', required: false, description: 'Return debug payload instead of plain list when true' })
  getDashboardCategories(
    @Param('storeId', new ParseObjectIdPipe()) storeId: string,
    @Query('debug') debug?: string,
  ) {
    const dbg = String(debug || '').toLowerCase();
    if (dbg === '1' || dbg === 'true') {
      return this.categoryService.getDashboardCategoriesDebug(storeId);
    }
    return this.categoryService.getDashboardCategories(storeId);
  }

  @Get('dashboard-products/:storeId')
@ApiOperation({ summary: 'Get dashboard products based on category codes from app settings' })
@ApiParam({ name: 'storeId', example: '652f1c2d9e4b1a2a3c1d2e3f4' })
@ApiResponse({ status: 200, type: [DashboardProductCategoryDto] })
@ApiQuery({ name: 'debug', required: false, description: 'Return debug payload instead of plain list when true' })
getDashboardProducts(
  @Param('storeId', new ParseObjectIdPipe()) storeId: string,
  @Query('debug') debug?: string,
) {
  const dbg = String(debug || '').toLowerCase();
  if (dbg === '1' || dbg === 'true') {
    return this.productService.getDashboardProductsDebug(storeId);
  }
  return this.productService.getDashboardProducts(storeId);
}
}
