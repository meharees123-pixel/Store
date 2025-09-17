import { ApiProperty } from '@nestjs/swagger';

// Base DTO for common properties
export class CategoryDto {
  @ApiProperty({ description: 'Name of the category' })
  name: string;

  @ApiProperty({ description: 'Description of the category' })
  description?: string;

  @ApiProperty({ description: 'Category code (e.g., FOD, BEV)' })
  categoryCode: string;

  @ApiProperty({ description: 'Image URL associated with the category' })
  categoryImage?: string;

  @ApiProperty({
    description: 'Store ID to which this category belongs',
    example: '64f1c2d9e4b1a2a3c1d2e3f4',
  })
  storeId: string;

  @ApiProperty()
  isActive: boolean;

}

// Create DTO (requires name and categoryCode)
export class CreateCategoryDto extends CategoryDto {
  @ApiProperty({ description: 'Name of the category', example: 'Fruits' })
  name: string;

  @ApiProperty({ description: 'Category code', example: 'FRUITS' })
  categoryCode: string;
}

// Update DTO allows partial updates
export class UpdateCategoryDto extends CategoryDto { }

// Response DTO includes MongoDB metadata
export class CategoryResponseDto extends CategoryDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}