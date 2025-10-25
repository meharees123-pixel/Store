import {
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

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<SubcategoryDocument>,
  ) {}

  async create(
    createSubcategoryDto: CreateSubcategoryDto,
    userId: string,
  ): Promise<SubcategoryDocument> {
    try {
      const subcategory = new this.subcategoryModel({
        ...createSubcategoryDto,
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
    return this.subcategoryModel.find().populate('categoryId').exec();
  }

  async findByCategoryId(categoryId: string): Promise<SubcategoryDocument[]> {
    try {
      const subcategories = await this.subcategoryModel
        .find({ categoryId })
        .populate('categoryId')
        .exec();

      return subcategories;
    } catch (error) {
      console.error('Find by categoryId error:', error);
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

    return subcategory;
  }

  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    userId: string,
  ): Promise<SubcategoryDocument> {
    const updated = await this.subcategoryModel
      .findByIdAndUpdate(
        id,
        { ...updateSubcategoryDto, updatedBy: userId },
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
}