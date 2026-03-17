import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { Order } from '../models/order.model';
import { Store } from '../models/store.model';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';

type StoreAggRow = {
  _id?: string;
  totalSales: number;
  orderCount: number;
};

type ProductAggRow = {
  _id?: string;
  totalSales: number;
  quantity: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<Store & Document>,
    @InjectModel(User.name)
    private readonly userModel: Model<User & Document>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order & Document>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product & Document>,
  ) {}

  async getDashboardReport(months = 6, topLimit = 5, storeId?: string) {
    const safeMonths = Math.max(1, Math.min(12, months));
    const safeLimit = Math.max(1, Math.min(12, topLimit));
    const normalizeStoreId = (value: string) =>
      Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
    const storeMatchBase: Record<string, unknown> =
      storeId && storeId.trim()
        ? { storeId: normalizeStoreId(storeId) }
        : { storeId: { $exists: true, $ne: null } };

    const orderMatchFilter: Record<string, unknown> = {};
    if (storeId && storeId.trim()) {
      orderMatchFilter.storeId = normalizeStoreId(storeId);
    }

    const [totalStores, totalUsers, totalOrders] = await Promise.all([
      storeId && storeId.trim()
        ? this.storeModel.countDocuments({ _id: normalizeStoreId(storeId) })
        : this.storeModel.countDocuments(),
      storeId && storeId.trim()
        ? this.orderModel
            .aggregate([
              { $match: orderMatchFilter },
              { $group: { _id: '$userId' } },
              { $count: 'count' },
            ])
            .then((rows) => Number(rows?.[0]?.count ?? 0))
        : this.userModel.countDocuments(),
      this.orderModel.countDocuments(orderMatchFilter),
    ]);

    const salesRow = await this.orderModel.aggregate([
      { $match: storeMatchBase },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
    ]);
    const totalSales = Number(salesRow?.[0]?.totalSales ?? 0);

    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - (safeMonths - 1));
    startDate.setHours(0, 0, 0, 0);

    const monthlyAggMatch = {
      createdAt: { $gte: startDate },
      ...storeMatchBase,
    };
    const monthlyAgg = await this.orderModel.aggregate([
      { $match: monthlyAggMatch },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyIndex = new Map<string, { totalSales: number; orderCount: number }>();
    monthlyAgg.forEach((row) => {
      const key = `${row._id.year}-${row._id.month}`;
      monthlyIndex.set(key, {
        totalSales: Number(row.totalSales ?? 0),
        orderCount: Number(row.orderCount ?? 0),
      });
    });

    const monthlySales = Array.from({ length: safeMonths }).map((_, idx) => {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + idx);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      const entry = monthlyIndex.get(key);
      return {
        year,
        month,
        totalSales: entry?.totalSales ?? 0,
        orderCount: entry?.orderCount ?? 0,
      };
    });

    const topStoresAggMatch = storeMatchBase;
    const topStoresAgg: StoreAggRow[] = await this.orderModel.aggregate([
      { $match: topStoresAggMatch },
      {
        $group: {
          _id: { $toString: '$storeId' },
          totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: safeLimit },
    ]);

    const topStores = await this.enrichStores(topStoresAgg);

    const topProductsAggMatch = storeMatchBase;
    const topProductsAgg: ProductAggRow[] = await this.orderModel.aggregate([
      { $match: topProductsAggMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $toString: '$items.productId' },
          totalSales: { $sum: { $ifNull: ['$items.totalPrice', 0] } },
          quantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: safeLimit },
    ]);
    const topProducts = await this.enrichProducts(topProductsAgg);

    return {
      totalStores,
      totalUsers,
      totalOrders,
      totalSales,
      monthlySales,
      topStores,
      topProducts,
    };
  }

  private async enrichStores(rows: StoreAggRow[]) {
    const ids = Array.from(new Set(rows.map((row) => row._id).filter(Boolean)));
    const objectIds = ids
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    const stores = objectIds.length
      ? await this.storeModel.find({ _id: { $in: objectIds } }).lean().exec()
      : [];
    const storeMap = new Map(stores.map((store) => [store._id.toString(), store]));

    return rows.map((row) => ({
      storeId: row._id ?? null,
      totalSales: Number(row.totalSales ?? 0),
      orderCount: Number(row.orderCount ?? 0),
      store: row._id ? storeMap.get(row._id) ?? null : null,
    }));
  }

  private async enrichProducts(rows: ProductAggRow[]) {
    const ids = Array.from(new Set(rows.map((row) => row._id).filter(Boolean)));
    const objectIds = ids
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    const products = objectIds.length
      ? await this.productModel
          .find({ _id: { $in: objectIds } })
          .select('name')
          .lean()
          .exec()
      : [];
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    return rows.map((row) => ({
      productId: row._id ?? null,
      totalSales: Number(row.totalSales ?? 0),
      quantity: Number(row.quantity ?? 0),
      product: row._id ? productMap.get(row._id) ?? null : null,
    }));
  }
}
