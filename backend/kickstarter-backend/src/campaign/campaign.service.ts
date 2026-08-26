import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';
import {
  Contribution,
  ContributionDocument,
} from 'src/schemas/Contributio.schema';

@Injectable()
export class CampaignService {
  constructor(
    @InjectModel(Contribution.name)
    private contributionModel: Model<ContributionDocument>,
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
  ) {}

  async getAllCampaigns() {
    try {
      return this.campaignModel.find().exec();
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      return await this.campaignModel.findOne({ id }).exec();
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      return this.campaignModel.findOne({ id });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  async updateMetadata(id: number, name: string, description: string) {
    return this.campaignModel.findOneAndUpdate(
      { id },
      { $set: { name, description } },
      { upsert: true, new: true },
    );
  }

  async deleteCampaign(id: string): Promise<Campaign | null> {
    try {
      return this.campaignModel.findOneAndDelete({ id }).exec();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  async getContributionsByVoter(voter: string) {
    const contributions = await this.contributionModel.find({
      voter: voter.toLowerCase(),
      amount: { $ne: '0' },
    });

    const campaignIds = contributions.map((c) => c.campaignId);
    const campaigns = await this.campaignModel.find({
      id: { $in: campaignIds },
    });

    return contributions.map((c) => {
      const campaign = campaigns.find((camp) => camp.id === c.campaignId);
      return { campaign, myContribution: c.amount };
    });
  }

  async getStatistics() {
    const campaigns = await this.campaignModel.find();
    const closedCampaigns = campaigns.filter((c) => c.closed);
    const successfulCampaigns = closedCampaigns.filter((c) => c.goalReached);
    const failedCampaigns = closedCampaigns.filter((c) => !c.goalReached);
  
    const totalRaised = successfulCampaigns.reduce(
      (sum, c) => sum + BigInt(c.finalAmountRaised || '0'),
      0n
    );
  
    const distinctContributors = await this.contributionModel.distinct('voter', {
      amount: { $ne: '0' },
    });
  
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.length - closedCampaigns.length,
      successfulCampaigns: successfulCampaigns.length,
      failedCampaigns: failedCampaigns.length,
      totalRaisedWei: totalRaised.toString(),
      uniqueContributors: distinctContributors.length,
    };
  }
  
}
