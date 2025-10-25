import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto
} from '../dto/category.dto';
import { Category } from '../models/category.model';
import { AppSettings } from '../models/app-settings.model';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category & Document>,

    @InjectModel(AppSettings.name)
    private readonly appSettingsModel: Model<AppSettings & Document>

  ) { }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category & Document> {
    return this.categoryModel.create(createCategoryDto);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async findOne(id: string): Promise<Category & Document> {
    return this.categoryModel.findById(id).exec();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category & Document> {
    return this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deletedDocument = await this.categoryModel.findByIdAndDelete(id).exec();
    return { deleted: !!deletedDocument };
  }

  async getDashboardCategories(storeId: string): Promise<Category[]> {
    const setting = await this.appSettingsModel.findOne({ key: 'dashboardCategoryCodes' }).exec();
    console.log("settings1", setting);

    if (!setting || typeof setting.value !== 'string') return [];

    let categoryCodes: string[];
    try {
      categoryCodes = JSON.parse(setting.value);
    } catch (err) {
      console.error("Failed to parse AppSettings value:", err);
      return [];
    }

    console.log("Parsed category codes:", categoryCodes);

    return this.categoryModel.find({
      storeId,
      categoryCode: { $in: categoryCodes },
    }).exec();
  }
}