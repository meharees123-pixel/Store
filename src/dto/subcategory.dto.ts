import { ApiProperty } from '@nestjs/swagger';

export class SubcategoryDto {
  @ApiProperty({ description: 'Name of the subcategory' })
  name: string;

  @ApiProperty({ example: 'FRUIT-001' })
  subcategoryCode: string;

  @ApiProperty({ description: 'Description of the subcategory' })
  description?: string;

  @ApiProperty({ description: 'Reference to parent category' })
  categoryId: string;

  @ApiProperty({ description: 'Image URL for the subcategory' })
  subcategoryImage?: string;

  @ApiProperty()
  isActive: boolean;
}

export class CreateSubcategoryDto extends SubcategoryDto { }

export class UpdateSubcategoryDto extends SubcategoryDto { }

export class SubcategoryResponseDto extends SubcategoryDto {
  @ApiProperty({ description: 'MongoDB document ID' })
  _id: string;

  @ApiProperty({ description: 'Timestamp of creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last update' })
  updatedAt: Date;
}
