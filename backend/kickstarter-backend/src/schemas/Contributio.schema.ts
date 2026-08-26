import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContributionDocument = Contribution & Document;

@Schema()
export class Contribution {
  @Prop({ required: true, lowercase: true })
  voter: string;

  @Prop({ required: true })
  campaignId: number;

  @Prop({ required: true, default: '0' })
  amount: string; // wei kao string, isto kao votes[voter][campaignId] na contractu
}

export const ContributionSchema = SchemaFactory.createForClass(Contribution);
ContributionSchema.index({ voter: 1, campaignId: 1 }, { unique: true });
