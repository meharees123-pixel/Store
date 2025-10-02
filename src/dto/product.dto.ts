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

  @ApiProperty({ description: 'Available quantity in stock', example: 100 })
  quantity: number;

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

export class DashboardProductCategoryDto {
  @ApiProperty({ example: '652f1c2d9e4b1a2a3c1d2e3f4' })
  _id: string;

  @ApiProperty({ example: 'Fruits' })
  name: string;

  @ApiProperty({ example: 'FRUIT' })
  code: string;

  @ApiProperty({ example: 'https://cdn.example.com/images/fruits.jpg' })
  image?: string;

  @ApiProperty({ example: 'Fresh and seasonal fruits' })
  description?: string;

  @ApiProperty({ type: [ProductResponseDto] })
  products: ProductResponseDto[];
}
