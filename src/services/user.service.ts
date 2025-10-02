import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../models/user.model';
import { FirebaseLoginDto, FirebaseLogoutDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async firebaseLogin(dto: FirebaseLoginDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ mobileNumber: dto.mobileNumber }).exec();

    if (existing) {
      existing.firebaseToken = dto.firebaseToken;
      existing.isActive = true;
      if (dto.name) existing.name = dto.name;
      return existing.save();
    }

    return this.userModel.create({
      mobileNumber: dto.mobileNumber,
      firebaseToken: dto.firebaseToken,
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