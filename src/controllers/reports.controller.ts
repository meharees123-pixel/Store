import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from '../services/reports.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { DashboardReportDto } from '../dto/reports.dto';

@ApiTags('reports')
@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Summary metrics and rankings for the admin dashboard' })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Number of months to include in the timeline (default: 6, max: 12)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top stores/products (default: 5, max: 12)',
  })
  @ApiQuery({
    name: 'storeId',
    required: false,
    description: 'Optional store identifier to restrict dashboard metrics',
  })
  @ApiResponse({ status: 200, type: DashboardReportDto })
  getDashboard(
    @Query('months') months?: string,
    @Query('limit') limit?: string,
    @Query('storeId') storeId?: string,
  ) {
    const monthsNum = Number(months ?? '');
    const limitNum = Number(limit ?? '');
    return this.reportsService.getDashboardReport(
      Number.isNaN(monthsNum) ? undefined : monthsNum,
      Number.isNaN(limitNum) ? undefined : limitNum,
      storeId,
    );
  }
}
