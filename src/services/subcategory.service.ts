import {
  Injectable,
  InternalServerErrorException,
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
import { User } from '../models/user.model'; // Import your User model

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
    return this.subcategoryModel
      .find({ categoryId: categoryId })
      .populate('categoryId')
      .exec();
  }

  async findOne(id: string): Promise<SubcategoryDocument> {
    return this.subcategoryModel
      .findById(id)
      .populate('categoryId')
      .exec();
  }

  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    userId: string,
  ): Promise<SubcategoryDocument> {
    return this.subcategoryModel
      .findByIdAndUpdate(
        id,
        { ...updateSubcategoryDto, updatedBy: userId },
        { new: true, runValidators: true },
      )
      .populate('categoryId')
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deletedDocument = await this.subcategoryModel
      .findByIdAndDelete(id)
      .exec();
    return { deleted: !!deletedDocument };
  }
}
