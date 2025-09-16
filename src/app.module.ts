import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserSchema } from './models/user.model';
import { CategoryController } from './controllers/category.controller';
import { CategoryService } from './services/category.service';
import { Category, CategorySchema } from './models/category.model';
import { SubcategoryController } from './controllers/subcategory.controller';
import { SubcategoryService } from './services/subcategory.service';
import { Subcategory, SubcategorySchema } from './models/subcategory.model';
import { Product, ProductSchema } from './models/product.model';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
@Module({
  imports: [
    MongooseModule.forRoot('mongodb://3.91.46.159:27017/Store'),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Product.name, schema: ProductSchema }
    ]),
    AuthModule
  ],
  controllers: [UserController, CategoryController, SubcategoryController,ProductController],
  providers: [UserService, CategoryService, SubcategoryService,ProductService],
})
export class AppModule {}