# Kickstarter DApp

A decentralized crowdfunding platform built on Ethereum. Campaigns, contributions, and payouts are all handled by a Solidity smart contract, with a NestJS backend indexing on-chain events into MongoDB for fast reads, and a React frontend for the user experience.

## Features

- **Wallet-based accounts** — Sign-In With Ethereum (SIWE): connect your wallet and sign a message to authenticate, no passwords involved.
- **Campaign creation** — set a funding goal (in ETH), a beneficiary address, and optionally enable **flexible funding**.
- **Voting (contributing)** — back a campaign by sending ETH; campaigns close automatically once the goal is reached.
- **Unvoting** — withdraw your contribution any time before a campaign closes.
- **Flexible funding** — campaigns can opt in (at creation time) to release funds to the beneficiary once at least 80% of the goal is raised, even if the full goal isn't met.
- **Refunds** — if a campaign closes without reaching its goal (or the flexible funding threshold), every backer can claim their contribution back individually.
- **Platform fee** — a 1% fee is taken only from successfully released funds and can be withdrawn by the contract owner.
- **Campaign details page** — name, description, funding progress, creator/beneficiary info, and vote/unvote/refund actions.
- **My Campaigns / My Contributions** — browse campaigns you created or backed, with search, filtering, and sorting.
- **Admin panel** — available to the contract owner: platform-wide statistics, a list of all campaigns, a list of all registered users, and the ability to claim accumulated platform fees.
- **Shareable campaign links** — copy a direct link to any campaign's detail page.

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity, Foundry |
| Backend | NestJS, MongoDB (Mongoose), ethers.js (event listening) |
| Frontend | React, TypeScript, Vite, ethers.js, React Router |
| Authentication | Sign-In With Ethereum (SIWE) + JWT |

## Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌───────────────┐
│   Frontend  │  RPC   │  Smart Contract   │ events │  Backend      │
│   (React)   │◄──────►│   (Solidity)      │───────►│  (NestJS)     │
└─────────────┘        └──────────────────┘        └───────┬───────┘
       ▲                                                     │
       │ REST API (campaigns, users, stats, auth)            ▼
       └─────────────────────────────────────────────  MongoDB
```

The blockchain is the source of truth for all funds and ownership. The backend listens to contract events (`CampaignCreated`, `Voted`, `Unvoted`, `CampaignClosed`, `Refunded`, `FundsClaimed`) and re-reads the affected campaign's on-chain state to keep MongoDB in sync, so the database is effectively a read-optimized cache — never authoritative on its own. Off-chain metadata (campaign name, description) lives only in MongoDB, since the contract intentionally does not store it.

## Project Structure

```
├── frontend/    React + TypeScript frontend
├── backend/     NestJS backend (REST API + on-chain event indexing)
└── foundary/    Solidity smart contracts (Foundry project)
```

## Prerequisites

- Node.js and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash`)
- MongoDB (local instance or MongoDB Atlas)
- MetaMask (or another Ethereum wallet)

## Getting Started (local development with Anvil)

### 1. Start a local blockchain

```bash
anvil
```

Keep this terminal running. Anvil prints 10 funded test accounts with their private keys — these are your test wallets. Note that restarting Anvil wipes all on-chain state.

### 2. Deploy the smart contract

```bash
cd foundary
forge script script/Kickstarter.s.sol:KickstarterScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <ANVIL_PRIVATE_KEY> \
  --broadcast
```

Note the deployed **Contract Address** from the output.

### 3. Get the contract ABI

After building, the ABI is available at `foundary/out/Kickstarter.sol/Kickstarter.json` (the `abi` field). Copy it into:
- `backend/src/common/abi.ts`
- `frontend/src/utils/abi.ts`

### 4. Configure and run the backend

Create `backend/.env`:

```
RPC_WS=ws://127.0.0.1:8545
CONTRACT_ADDRESS=<deployed contract address>
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<a long random string>
```

```bash
cd backend
npm install
npm start
```

### 5. Configure and run the frontend

Create `frontend/.env`:

```
VITE_CONTRACT_ADDRESS=<deployed contract address>
```

```bash
cd frontend
npm install
npm run dev
```

### 6. Connect MetaMask to the local network

Add a network manually:
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`

Import one of the Anvil test accounts using its private key, then open the app and connect your wallet.

## Smart Contract Overview

| Function | Description |
|---|---|
| `createCampaign(threshold, beneficiary, flexibleFunding)` | Creates a new campaign. |
| `vote(campaignId)` | Contributes ETH to a campaign (payable). Auto-closes the campaign if the goal is reached. |
| `unvote(campaignId)` | Withdraws your contribution from an still-open campaign. |
| `creatorOnlyCloseCampaign(campaignId)` | Lets the campaign creator close it manually. |
| `refund(campaignId)` | Lets a backer reclaim their contribution from a closed campaign that didn't reach its goal. |
| `claimFunds()` | Lets the contract owner withdraw accumulated platform fees (owner-only). |
| `getCampaign(campaignId)` | Returns full campaign details. |

A campaign closes successfully (funds sent to the beneficiary, minus a 1% platform fee) when either:
- the full funding goal is reached, **or**
- flexible funding is enabled for that campaign **and** at least 80% of the goal was raised at the time of closing.

Otherwise, funds remain in the contract and each backer withdraws their own contribution via `refund()`.

## Roadmap / Future Work

- Real-time UI updates via WebSockets instead of polling after transactions
- Campaign images/banners
- Foundry test suite covering all contract paths
- Sepolia testnet deployment

## License

This project is licensed under the MIT License.
