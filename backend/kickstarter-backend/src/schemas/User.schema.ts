import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  address: string;

  @Prop({ required: true })
  nonce: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
