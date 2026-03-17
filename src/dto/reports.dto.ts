import { ApiProperty } from '@nestjs/swagger';

class DashboardStoreInfoDto {
  @ApiProperty({ description: 'Store identifier' })
  _id: string;

  @ApiProperty({ description: 'Store name', required: false, nullable: true })
  name?: string;

  @ApiProperty({ description: 'Store location', required: false, nullable: true })
  location?: string;
}

class DashboardProductInfoDto {
  @ApiProperty({ description: 'Product identifier' })
  _id: string;

  @ApiProperty({ description: 'Product name', required: false, nullable: true })
  name?: string;
}

export class DashboardMonthlySalesDto {
  @ApiProperty({ description: 'Year of the month' })
  year: number;

  @ApiProperty({ description: 'Month number (1-12)' })
  month: number;

  @ApiProperty({ description: 'Total sales amount for the month' })
  totalSales: number;

  @ApiProperty({ description: 'Number of orders in that month' })
  orderCount: number;
}

export class DashboardTopStoreDto {
  @ApiProperty({ description: 'Store identifier', nullable: true })
  storeId?: string;

  @ApiProperty({
    type: () => DashboardStoreInfoDto,
    required: false,
    nullable: true,
  })
  store?: DashboardStoreInfoDto | null;

  @ApiProperty({ description: 'Total sales amount for the store' })
  totalSales: number;

  @ApiProperty({ description: 'Number of orders contributed by the store' })
  orderCount: number;
}

export class DashboardTopProductDto {
  @ApiProperty({ description: 'Product identifier', nullable: true })
  productId?: string;

  @ApiProperty({
    type: () => DashboardProductInfoDto,
    required: false,
    nullable: true,
  })
  product?: DashboardProductInfoDto | null;

  @ApiProperty({ description: 'Total sales for the product' })
  totalSales: number;

  @ApiProperty({ description: 'Total quantity sold' })
  quantity: number;
}

export class DashboardReportDto {
  @ApiProperty({ description: 'Total number of stores' })
  totalStores: number;

  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Total sales amount' })
  totalSales: number;

  @ApiProperty({
    description: 'Monthly sales timeline',
    type: () => DashboardMonthlySalesDto,
    isArray: true,
  })
  monthlySales: DashboardMonthlySalesDto[];

  @ApiProperty({
    description: 'Top stores by sales',
    type: () => DashboardTopStoreDto,
    isArray: true,
  })
  topStores: DashboardTopStoreDto[];

  @ApiProperty({
    description: 'Top products by sales',
    type: () => DashboardTopProductDto,
    isArray: true,
  })
  topProducts: DashboardTopProductDto[];
}
