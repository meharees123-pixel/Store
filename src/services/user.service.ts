import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../models/user.model';
import {
  CreateUserDto,
  FirebaseLoginDto,
  FirebaseLogoutDto,
  UpdateUserDto,
} from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getAllUsers(): Promise<Omit<User, 'firebaseToken'>[]> {
    return this.userModel
      .find()
      .select('-firebaseToken')
      .lean()
      .exec();
  }

  async getUserById(id: string): Promise<Omit<User, 'firebaseToken'> & { _id: unknown }> {
    const objectId = new Types.ObjectId(id);
    const user = await this.userModel
      .findById(objectId)
      .lean()
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto, userId?: string) {
    try {
      const created = await this.userModel.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });

      return this.getUserById(created._id.toString());
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Duplicate field value (email/mobileNumber must be unique)');
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async updateUser(id: string, dto: UpdateUserDto, userId?: string) {
    try {
      const objectId = new Types.ObjectId(id);
      const updated = await this.userModel
        .findByIdAndUpdate(
          objectId,
          {
            ...dto,
            updatedBy: userId,
          },
          { new: true },
        )
        .select('-firebaseToken')
        .lean()
        .exec();

      if (!updated) throw new NotFoundException('User not found');
      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Duplicate field value (email/mobileNumber must be unique)');
      }
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating user');
    }
  }

  async deleteUser(id: string): Promise<{ deleted: boolean }> {
    const objectId = new Types.ObjectId(id);
    const deletedDocument = await this.userModel.findByIdAndDelete(objectId).exec();
    return { deleted: !!deletedDocument };
  }

  async firebaseLogin(dto: FirebaseLoginDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ mobileNumber: dto.mobileNumber }).exec();
    const token = dto.firebaseToken?.trim() || randomUUID();

    if (existing) {
      existing.firebaseToken = token;
      existing.isActive = true;
      if (dto.name) existing.name = dto.name;
      return existing.save();
    }

    return this.userModel.create({
      mobileNumber: dto.mobileNumber,
      firebaseToken: token,
      name: dto.name,
      isActive: true,
    });
  }

  async firebaseLogout(dto: FirebaseLogoutDto): Promise<{ success: boolean }> {
    const user = await this.userModel.findOne({ mobileNumber: dto.mobileNumber }).exec();
    if (!user) throw new NotFoundException('User not found');

    user.firebaseToken = undefined;
    user.isActive = false;
    await user.save();

    return { success: true };
  }
}
