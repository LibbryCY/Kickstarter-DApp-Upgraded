/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ABI } from '../common/abi';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';
import {
  Contribution,
  ContributionDocument,
} from 'src/schemas/Contributio.schema';

dotenv.config();
const rpcWS = process.env.RPC_WS || '';
const contractAddress = process.env.CONTRACT_ADDRESS || '';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private provider: ethers.WebSocketProvider;
  private contract: ethers.Contract;

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(Contribution.name)

    private contributionModel: Model<ContributionDocument>,
  ) {
    this.provider = new ethers.WebSocketProvider(rpcWS);
    this.contract = new ethers.Contract(contractAddress, ABI, this.provider);
  }


  private async syncCampaignFromChain(campaignId: number) {
    const onChain = await this.contract.getCampaign(campaignId);
    await this.campaignModel.findOneAndUpdate(
      { id: campaignId },
      {
        $set: {
          creator: onChain.creator,
          threshold: onChain.threshold.toString(),
          balance: onChain.balance.toString(),
          beneficiary: onChain.beneficiary,
          numberOfVotes: Number(onChain.numberOfVotes),
          closed: onChain.closed,
          goalReached: onChain.goalReached,
          flexibleFunding: onChain.flexibleFunding,
        },
        $setOnInsert: { id: campaignId, name: '', description: '' },
      },
      { upsert: true }
    );
  }
  
  private async syncContribution(voter: string, campaignId: number) {
    const amount: bigint = await this.contract.votes(voter, campaignId);
    await this.contributionModel.findOneAndUpdate(
      { voter: voter.toLowerCase(), campaignId },
      { $set: { amount: amount.toString() } },
      { upsert: true }
    );
  }

  onModuleInit() {
    this.contract.on('CampaignCreated', async (campaignId) => {
      await this.syncCampaignFromChain(Number(campaignId));
    });
  
    this.contract.on('Voted', async (campaignId, voter) => {
      await this.syncCampaignFromChain(Number(campaignId));
      await this.syncContribution(String(voter), Number(campaignId));
    });
  
    this.contract.on('Unvoted', async (campaignId, voter) => {
      await this.syncCampaignFromChain(Number(campaignId));
      await this.syncContribution(String(voter), Number(campaignId));
    });
  
    this.contract.on('CampaignClosed', async (campaignId, amountTransferred:number) => {
      await this.syncCampaignFromChain(Number(campaignId));
      await this.campaignModel.findOneAndUpdate(
        { id: Number(campaignId) },
        { $set: { finalAmountRaised: amountTransferred.toString() } }
      );
    });
  
    this.contract.on('Refunded', async (campaignId, voter) => {
      await this.syncCampaignFromChain(Number(campaignId));
      await this.syncContribution(String(voter), Number(campaignId));
    });
  

    this.contract.on('FundsClaimed', (fundsToClaim) => {
      console.log(`Platform fee claimed by owner: ${fundsToClaim}`);
      
    });
  }
}
