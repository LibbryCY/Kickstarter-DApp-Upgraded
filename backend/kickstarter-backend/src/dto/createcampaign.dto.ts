import { IsNumber, IsEthereumAddress } from 'class-validator';

export class CreateCampaignDto {
  @IsNumber()
  goal: number;

  @IsEthereumAddress()
  beneficiary: string;
}