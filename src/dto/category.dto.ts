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
}

// Create DTO (requires name and categoryCode)
export class CreateCategoryDto extends CategoryDto {
  @ApiProperty({ description: 'Name of the category', example: 'Fruits' })
  name: string;

  @ApiProperty({ description: 'Category code', example: 'FRUITS' })
  categoryCode: string;
}

// Update DTO allows partial updates
export class UpdateCategoryDto extends CategoryDto {}

// Response DTO includes MongoDB metadata
export class CategoryResponseDto extends CategoryDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}