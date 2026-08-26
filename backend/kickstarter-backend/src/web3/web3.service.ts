
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers, JsonRpcProvider } from 'ethers';
import * as dotenv from 'dotenv';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ABI } from '../common/abi';
import { updateLastProcessedBlock, getLastProcessedBlock } from '../common/utils';

dotenv.config();
const privateKey = process.env.PRIVATE_KEY || '';
const rpcUrl = process.env.RPC_URL || '';
const contractAddress = process.env.CONTRACT_ADDRESS || '';

@Injectable()
export class Web3Service implements OnModuleInit {
  onModuleInit() {
    throw new Error('Method not implemented.');
  }
//   private provider: JsonRpcProvider;
//   private contract: ethers.Contract;
//   private contractAbi = ABI;

//   constructor(
//     @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>
//   ) {
//     this.provider = new ethers.JsonRpcProvider(rpcUrl);
//     this.contract = new ethers.Contract(contractAddress, this.contractAbi, this.provider);
//   }

//   async onModuleInit() {
//     await this.listenToEvents();
//   }

//   async listenToEvents() {
//     let lastProcessedBlock = getLastProcessedBlock();
//     const pollingInterval = 10000; // 10 seconds
//     const batchSize = 1000;

//     setInterval(async () => {
//       try {
//         const latestBlock = await this.provider.getBlockNumber();
//         if (latestBlock <= lastProcessedBlock) return;

//         let fromBlock = lastProcessedBlock + 1;

//         while (fromBlock <= latestBlock) {
//           const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);

//           const logs = await this.provider.getLogs({
//             address: contractAddress,
//             fromBlock,
//             toBlock,
//           });

//           for (const log of logs) {
//             try {
//               const parsedLog = this.contract.interface.parseLog(log);
//               const event = parsedLog?.args;
//               const name = parsedLog?.name;

//               console.log(`Parsed event: ${name} in block ${log.blockNumber}`);

//               switch (name) {
//                 case 'CampaignCreated':
//                   await this.handleCampaignCreated(event);
//                   break;
//                 case 'Voted':
//                   await this.handleVoted(event);
//                   break;
//                 case 'Unvoted':
//                   await this.handleUnvoted(event);
//                   break;
//                 case 'CampaignClosed':
//                   await this.handleCampaignClosed(event);
//                   break;
//                 case 'FundsClaimed':
//                   await this.handleFundsClaimed(event);
//                   break;
//               }

//               lastProcessedBlock = log.blockNumber;
//               await updateLastProcessedBlock(lastProcessedBlock);
//             } catch (err) {
//               console.error('Failed to parse or handle log:', err);
//             }
//           }

//           fromBlock = toBlock + 1;
//         }
//       } catch (error) {
//         console.error('Error fetching logs:', error);
//       }
//     }, pollingInterval);
}

//   private async handleCampaignCreated(event: any) {
//     const exists = await this.campaignModel.findOne({ id: Number(event.campaignId) });
//     if (!exists) {
//       const newCampaign = new this.campaignModel({
//         id: Number(event.campaignId),
//         creator: String(event.creator),
//         threshold: String(event.threshold),
//         balance: 0,
//         beneficiary: event.beneficiary,
//         numberOfVotes: 0,
//         closed: false,
//       });
//       await newCampaign.save();
//     }
//   }

//   private async handleVoted(event: any) {
//     await this.campaignModel.findOneAndUpdate(
//       { id: Number(event.campaignId) },
//       { $inc: { balance: Number(event.amount), numberOfVotes: 1 } }
//     );
//   }

//   private async handleUnvoted(event: any) {
//     await this.campaignModel.findOneAndUpdate(
//       { id: Number(event.campaignId) },
//       { $inc: { balance: -Number(event.amount), numberOfVotes: -1 } }
//     );
//   }

//   private async handleCampaignClosed(event: any) {
//     await this.campaignModel.findOneAndUpdate(
//       { id: Number(event.campaignId) },
//       {
//         closed: true,
//         numberOfVotes: 0,
//         $inc: { balance: -Number(event.amountTransferred) },
//       }
//     );
//   }

//   private async handleFundsClaimed(event: any) {
//     await this.campaignModel.updateMany(
//       { closed: true },
//       { $set: { balance: 0 } }
//     );
//   }
// }
