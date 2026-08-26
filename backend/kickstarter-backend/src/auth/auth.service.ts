import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import { User, UserDocument } from 'src/schemas/User.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async getNonce(address: string): Promise<string> {
    const normalized = address.toLowerCase();
    const nonce = randomBytes(16).toString('hex');

    await this.userModel.findOneAndUpdate(
      { address: normalized },
      { address: normalized, nonce },
      { upsert: true, new: true },
    );

    return nonce;
  }

  async verifySignature(
    address: string,
    signature: string,
  ): Promise<{ access_token: string }> {
    const normalized = address.toLowerCase();
    const user = await this.userModel.findOne({ address: normalized });
    if (!user)
      throw new UnauthorizedException('Nonce ne postoji, zatraži novi');

    const message = `Prijava na Kickstarter DApp. Nonce: ${user.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== normalized) {
      throw new UnauthorizedException('Potpis se ne poklapa sa adresom');
    }

    // Nonce se troši nakon uspešnog logina - sprečava replay napad
    user.nonce = randomBytes(16).toString('hex');
    await user.save();

    const payload = { sub: normalized };
    return { access_token: this.jwtService.sign(payload) };
  }

  async getAllUsers() {
    return this.userModel.find().select('address createdAt').sort({ createdAt: -1 });
  }

}
