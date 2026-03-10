import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto
} from '../dto/category.dto';
import { Category } from '../models/category.model';
import { AppSettings } from '../models/app-settings.model';
import { GcsStorageService } from './gcs-storage.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category & Document>,

    @InjectModel(AppSettings.name)
    private readonly appSettingsModel: Model<AppSettings & Document>,

    private readonly gcsStorage: GcsStorageService,

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

  async uploadCategoryImage(params: {
    id: string;
    file: { buffer: Buffer; mimetype?: string; originalname?: string };
    userId?: string;
  }) {
    const { id, file, userId } = params;
    if (!file?.buffer) throw new BadRequestException('Missing image file');

    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');

    await this.gcsStorage.deleteByPublicUrl(category.categoryImage);

    const uploaded = await this.gcsStorage.uploadImage({
      folder: 'categories',
      entityId: id,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    category.categoryImage = uploaded.publicUrl;
    if (userId) category.updatedBy = userId;
    await category.save();

    return category;
  }

  async deleteCategoryImage(params: { id: string; userId?: string }) {
    const { id, userId } = params;
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');

    await this.gcsStorage.deleteByPublicUrl(category.categoryImage);
    category.categoryImage = undefined;
    if (userId) category.updatedBy = userId;
    await category.save();

    return category;
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
