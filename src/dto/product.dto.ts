import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ description: 'Product name', example: 'iPhone 15' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description?: string;

  @ApiProperty({ description: 'Product price', example: 999.99 })
  price: number;

  @ApiProperty({ description: 'Product image URL' })
  productImage?: string;

  @ApiProperty({ description: 'Parent category ID', example: '68c467b88f1124a8b0fcd2b3' })
  categoryId: string;

  @ApiProperty({ description: 'Parent subcategory ID', example: '68c467b88f1124a8b0fcd2b3' })
  subcategoryId?: string;

  @ApiProperty()
  isActive: boolean;
}

export class CreateProductDto extends ProductDto { }

export class UpdateProductDto extends ProductDto { }

export class ProductResponseDto extends ProductDto {
  @ApiProperty({ description: 'MongoDB document ID' })
  _id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
