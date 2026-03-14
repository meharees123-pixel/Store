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
    ApiConsumes,
} from '@nestjs/swagger';
import {
    CreateSubcategoryDto,
    UpdateSubcategoryDto,
    SubcategoryResponseDto,
} from '../dto/subcategory.dto';
import { SubcategoryService } from '../services/subcategory.service';
import { AuthGuard } from '../guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('subcategories')
@UseGuards(AuthGuard)
@Controller('subcategories')
export class SubcategoryController {
    constructor(private readonly subcategoryService: SubcategoryService) { }
    //@UseGuards(AuthGuard)
    @Post()
    @ApiOperation({ summary: 'Create a new subcategory' })
    @ApiResponse({ status: 201, type: SubcategoryResponseDto })
    create(
        @Body() createSubcategoryDto: CreateSubcategoryDto,
        @Req() request: Request,
    ) {
        const userId = (request.user as any)?.id; // Extract from JWT
        return this.subcategoryService.create(createSubcategoryDto, userId);
    }

    @Get()
      @ApiOperation({ summary: 'Get all categories' })
      @ApiResponse({ status: 200, type: [CreateSubcategoryDto] })
      findAll() {
        return this.subcategoryService.findAll();
      }

    //@UseGuards(AuthGuard)
    @Put(':id')
    @ApiOperation({ summary: 'Update a subcategory' })
    @ApiResponse({ status: 200, type: SubcategoryResponseDto })
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateSubcategoryDto: UpdateSubcategoryDto,
        @Req() request: Request,
    ) {
        const userId = (request.user as any)?.id; // Extract from JWT
        return this.subcategoryService.update(id, updateSubcategoryDto, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get sub category by ID' })
    @ApiResponse({ status: 200, type: SubcategoryResponseDto })
    findOne(@Param('id') id: string) {
        return this.subcategoryService.findOne(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete sub category by ID' })
    @ApiResponse({ status: 204, description: 'Category deleted' })
    delete(@Param('id', new ParseObjectIdPipe()) id: string) {
        return this.subcategoryService.delete(id);
    }

    @Get('/category/:categoryId')
    @ApiOperation({ summary: 'Get all subcategories by category ID' })
    @ApiResponse({ status: 200, type: [SubcategoryResponseDto] })
    findByCategoryId(@Param('categoryId', ParseObjectIdPipe) categoryId: string) {
    return this.subcategoryService.findByCategoryId(categoryId);
    }

    @Get('/store/:storeId')
    @ApiOperation({ summary: 'Get all subcategories by store ID' })
    @ApiResponse({ status: 200, type: [SubcategoryResponseDto] })
    findByStoreId(@Param('storeId', ParseObjectIdPipe) storeId: string) {
      return this.subcategoryService.findByStoreId(storeId);
    }

    @Post(':id/image')
    @ApiOperation({ summary: 'Upload subcategory image' })
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
      return this.subcategoryService.uploadSubcategoryImage({ id, file, userId });
    }

    @Put(':id/image')
    @ApiOperation({ summary: 'Replace subcategory image' })
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
      return this.subcategoryService.uploadSubcategoryImage({ id, file, userId });
    }

    @Delete(':id/image')
    @ApiOperation({ summary: 'Delete subcategory image' })
    @ApiResponse({ status: 200, type: SubcategoryResponseDto })
    deleteImage(@Param('id', new ParseObjectIdPipe()) id: string, @Req() request: Request) {
      const userId = request.user?.id;
      return this.subcategoryService.deleteSubcategoryImage({ id, userId });
    }

}
