import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserSchema } from './models/user.model';

import { Store, StoreSchema } from './models/store.model';
import { StoreController } from './controllers/store.controller';
import { StoreService } from './services/store.service';

import { Category, CategorySchema } from './models/category.model';
import { CategoryController } from './controllers/category.controller';
import { CategoryService } from './services/category.service';

import { Subcategory, SubcategorySchema } from './models/subcategory.model';
import { SubcategoryController } from './controllers/subcategory.controller';
import { SubcategoryService } from './services/subcategory.service';

import { Product, ProductSchema } from './models/product.model';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';

import { DeliveryLocation, DeliveryLocationSchema } from './models/delivery-location.model';
import { DeliveryLocationController } from './controllers/delivery-location.controller';
import { DeliveryLocationService } from './services/delivery-location.service';

import { UserAddress, UserAddressSchema } from './models/user-address.model';
import { UserAddressController } from './controllers/user-address.controller';
import { UserAddressService } from './services/user-address.service';

import { Cart, CartSchema } from './models/cart.model';
import { CartController } from './controllers/cart.controller';
import { CartService } from './services/cart.service';

import { Order, OrderSchema } from './models/order.model';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';

import { AppSettings, AppSettingsSchema } from './models/app-settings.model';
import { AppSettingsController } from './controllers/app-settings.controller';
import { AppSettingsService } from './services/app-settings.service';

import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://3.91.46.159:27017/Store'),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: Store.name, schema: StoreSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: DeliveryLocation.name, schema: DeliveryLocationSchema },
      { name: UserAddress.name, schema: UserAddressSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
      { name: AppSettings.name, schema: AppSettingsSchema },
    ]),
    AuthModule,
  ],
  controllers: [
    UserController,
    StoreController,
    CategoryController,
    SubcategoryController,
    ProductController,
    DeliveryLocationController,
    UserAddressController,
    CartController,
    OrderController,
    AppSettingsController,
  ],
  providers: [
    UserService,
    StoreService,
    CategoryService,
    SubcategoryService,
    ProductService,
    DeliveryLocationService,
    UserAddressService,
    CartService,
    OrderService,
    AppSettingsService,
    AuthGuard
  ],
})
export class AppModule {}