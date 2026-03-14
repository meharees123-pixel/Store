import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  SubcategoryResponseDto,
} from '../dto/subcategory.dto';
import {
  Subcategory,
  SubcategoryDocument,
} from '../models/subcategory.model';
import { Category, CategoryDocument } from '../models/category.model';
import { GcsStorageService } from './gcs-storage.service';

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<SubcategoryDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly gcsStorage: GcsStorageService,
  ) {}

  async create(
    createSubcategoryDto: CreateSubcategoryDto,
    userId: string,
  ): Promise<SubcategoryDocument> {
    try {
      const category = await this.categoryModel
        .findById(createSubcategoryDto.categoryId)
        .exec();
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createSubcategoryDto.categoryId} not found`,
        );
      }

      const subcategory = new this.subcategoryModel({
        ...createSubcategoryDto,
        storeId: String(category.storeId),
        createdBy: userId,
        updatedBy: userId,
      });
      return await subcategory.save();
    } catch (error) {
      console.error('Create subcategory error:', error);
      throw new InternalServerErrorException('Error creating subcategory');
    }
  }

  async findAll(): Promise<SubcategoryDocument[]> {
    const rows = await this.subcategoryModel
      .find()
      .populate('categoryId')
      .exec();

    // Backfill storeId for older documents (derived from populated categoryId)
    for (const row of rows as any[]) {
      if (!row?.storeId && row?.categoryId?.storeId) {
        row.storeId = String(row.categoryId.storeId);
      }
    }

    return rows;
  }

  async findByCategoryId(categoryId: string): Promise<SubcategoryDocument[]> {
    try {
      const subcategories = await this.subcategoryModel
        .find({ categoryId })
        .populate('categoryId')
        .exec();

      for (const row of subcategories as any[]) {
        if (!row?.storeId && row?.categoryId?.storeId) {
          row.storeId = String(row.categoryId.storeId);
        }
      }

      return subcategories;
    } catch (error) {
      console.error('Find by categoryId error:', error);
      throw new InternalServerErrorException('Error fetching subcategories');
    }
  }

  async findByStoreId(storeId: string): Promise<SubcategoryDocument[]> {
    try {
      const categories = await this.categoryModel
        .find({ storeId })
        .select({ _id: 1 })
        .exec();

      const categoryIds = categories.map((c) => c._id);
      if (!categoryIds.length) return [];

      const rows = await this.subcategoryModel
        .find({ categoryId: { $in: categoryIds } })
        .populate('categoryId')
        .exec();

      for (const row of rows as any[]) {
        if (!row?.storeId) row.storeId = String(storeId);
      }

      return rows;
    } catch (error) {
      console.error('Find by storeId error:', error);
      throw new InternalServerErrorException('Error fetching subcategories');
    }
  }

  async findOne(id: string): Promise<SubcategoryDocument> {
    const subcategory = await this.subcategoryModel
      .findById(id)
      .populate('categoryId')
      .exec();

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    if ((subcategory as any)?.categoryId?.storeId && !(subcategory as any)?.storeId) {
      (subcategory as any).storeId = String((subcategory as any).categoryId.storeId);
    }

    return subcategory;
  }

  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    userId: string,
  ): Promise<SubcategoryDocument> {
    const category = await this.categoryModel
      .findById(updateSubcategoryDto.categoryId)
      .exec();
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${updateSubcategoryDto.categoryId} not found`,
      );
    }

    const updated = await this.subcategoryModel
      .findByIdAndUpdate(
        id,
        {
          ...updateSubcategoryDto,
          storeId: String(category.storeId),
          updatedBy: userId,
        },
        { new: true, runValidators: true },
      )
      .populate('categoryId')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deletedDocument = await this.subcategoryModel
      .findByIdAndDelete(id)
      .exec();

    return { deleted: !!deletedDocument };
  }

  async uploadSubcategoryImage(params: {
    id: string;
    file: { buffer: Buffer; mimetype?: string; originalname?: string };
    userId?: string;
  }) {
    const { id, file, userId } = params;
    if (!file?.buffer) throw new BadRequestException('Missing image file');

    const subcategory = await this.subcategoryModel.findById(id).exec();
    if (!subcategory) throw new NotFoundException('Subcategory not found');

    await this.gcsStorage.deleteByPublicUrl(subcategory.subcategoryImage);

    const uploaded = await this.gcsStorage.uploadImage({
      folder: 'subcategories',
      entityId: id,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    subcategory.subcategoryImage = uploaded.publicUrl;
    if (userId) (subcategory as any).updatedBy = userId;
    await subcategory.save();

    return subcategory;
  }

  async deleteSubcategoryImage(params: { id: string; userId?: string }) {
    const { id, userId } = params;

    const subcategory = await this.subcategoryModel.findById(id).exec();
    if (!subcategory) throw new NotFoundException('Subcategory not found');

    await this.gcsStorage.deleteByPublicUrl(subcategory.subcategoryImage);
    subcategory.subcategoryImage = undefined;
    if (userId) (subcategory as any).updatedBy = userId;
    await subcategory.save();

    return subcategory;
  }
}
