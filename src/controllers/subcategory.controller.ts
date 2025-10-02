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
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../utils/parse-object-id.pipe';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiParam,
    ApiBody,
    ApiHeader,
} from '@nestjs/swagger';
import {
    CreateSubcategoryDto,
    UpdateSubcategoryDto,
    SubcategoryResponseDto,
} from '../dto/subcategory.dto';
import { SubcategoryService } from '../services/subcategory.service';
import { AuthGuard } from '../guards/auth.guard';
import { UseGuards } from '@nestjs/common';

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
}