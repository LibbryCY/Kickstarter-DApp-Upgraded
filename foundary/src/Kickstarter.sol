// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

/// @title Kickstarter Campaign Contract
/// @author Lazar
/// @notice Allows users to create fundraising campaigns, vote with ETH, unvote, claim funds, and refund backers of failed campaigns.
/// @dev Uses custom errors and emits events for off-chain tracking. ETH is stored per campaign.

struct Campaign {
    uint256 id;
    address creator;
    uint256 threshold;
    uint256 balance;
    address beneficiary;
    uint256 numberOfVotes;
    bool closed;
    bool goalReached;       ///< True if threshold was met (or flexible minimum) when closed
    bool flexibleFunding;   ///< Set at creation - if true, funds release to beneficiary at 80%+ even if goal isn't fully met
}

contract Kickstarter {
    error NotExists(uint256 campaignId);
    error NotOwner();
    error NotCreator();
    error NotEnoughEth(uint256 amount);
    error FailedTransaction();
    error ClosedCampaign(uint256 amount);
    error NothingToClaim();
    error CampaignStillOpen(uint256 campaignId);
    error NoRefundAvailable(uint256 campaignId);

    uint256 public constant FEE_BPS = 100; // 1% = 100 basis points out of 10000

    uint256 public nextId = 1;
    address public immutable owner;
    uint256 public fundsToClaim = 0;

    constructor() {
        owner = msg.sender;
    }

    mapping(uint256 => Campaign) public idToCampaign;
    mapping(address voter => mapping(uint256 campId => uint256 amount)) public votes;

    event CampaignCreated(
        uint256 campaignId,
        address creator,
        uint256 threshold,
        address beneficiary,
        bool flexibleFunding
    );
    event Voted(uint256 indexed campaignId, address indexed voter, uint256 amount);
    event Unvoted(uint256 indexed campaignId, address indexed voter, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId, uint256 amountTransferred);
    event Refunded(uint256 indexed campaignId, address indexed voter, uint256 amount);
    event FundsClaimed(uint256 fundsToClaim);

    modifier onlyCreator(uint256 _campaignId) {
        if (idToCampaign[_campaignId].creator != msg.sender) revert NotCreator();
        _;
    }

    modifier onlyOwner() {
        if (owner != msg.sender) revert NotOwner();
        _;
    }

    /// @notice Create a new fundraising campaign
    /// @param minEthThreshold Minimum ETH needed (in wei) to succeed
    /// @param _beneficiary Address to receive funds if goal is reached
    /// @param _flexibleFunding If true, backers agree upfront that funds may be released at 80%+ even without full goal
    function createCampaign(
        uint256 minEthThreshold,
        address _beneficiary,
        bool _flexibleFunding
    ) public {
        Campaign memory newCampaign = Campaign({
            id: nextId,
            creator: msg.sender,
            balance: 0,
            threshold: minEthThreshold,
            beneficiary: _beneficiary,
            numberOfVotes: 0,
            closed: false,
            goalReached: false,
            flexibleFunding: _flexibleFunding
        });

        idToCampaign[nextId] = newCampaign;

        emit CampaignCreated(nextId, msg.sender, minEthThreshold, _beneficiary, _flexibleFunding);

        nextId++;
    }

    function vote(uint256 _campaignId) public payable {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);
        if (idToCampaign[_campaignId].closed) revert ClosedCampaign(_campaignId);
        if (msg.value == 0) revert NotEnoughEth(msg.value);

        votes[msg.sender][_campaignId] += msg.value;
        idToCampaign[_campaignId].balance += msg.value;
        idToCampaign[_campaignId].numberOfVotes++;

        emit Voted(_campaignId, msg.sender, msg.value);

        if (idToCampaign[_campaignId].balance >= idToCampaign[_campaignId].threshold) {
            closeCampaign(_campaignId);
        }
    }

    function unvote(uint256 _campaignId) public {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);
        if (idToCampaign[_campaignId].closed) revert ClosedCampaign(_campaignId);

        uint256 amountToUnvote = votes[msg.sender][_campaignId];
        if (amountToUnvote == 0) revert NotEnoughEth(0);

        votes[msg.sender][_campaignId] = 0;
        idToCampaign[_campaignId].balance -= amountToUnvote;
        idToCampaign[_campaignId].numberOfVotes--;

        (bool success, ) = payable(msg.sender).call{value: amountToUnvote}("");
        if (!success) revert FailedTransaction();

        emit Unvoted(_campaignId, msg.sender, amountToUnvote);
    }

    function creatorOnlyCloseCampaign(uint256 _campaignId) public onlyCreator(_campaignId) {
        closeCampaign(_campaignId);
    }

    /// @dev Closes a campaign. Sends funds to beneficiary (minus fee) if goal met, or if
    /// flexible funding is enabled and at least 80% of threshold was raised. Otherwise,
    /// funds stay in the contract and backers can call refund() individually.
    function closeCampaign(uint256 _campaignId) private {
        Campaign storage campaign = idToCampaign[_campaignId];
        if (campaign.id == 0) revert NotExists(_campaignId);
        if (campaign.closed) revert ClosedCampaign(_campaignId);

        campaign.closed = true;

        bool metThreshold = campaign.balance >= campaign.threshold;
        bool metFlexibleMinimum = campaign.flexibleFunding &&
            campaign.balance * 100 >= campaign.threshold * 80;

        if (metThreshold || metFlexibleMinimum) {
            campaign.goalReached = true;

            uint256 fee = (campaign.balance * FEE_BPS) / 10000;
            uint256 amountToTransfer = campaign.balance - fee;
            campaign.balance = 0;
            fundsToClaim += fee;

            (bool success, ) = payable(campaign.beneficiary).call{value: amountToTransfer}("");
            if (!success) revert FailedTransaction();

            emit CampaignClosed(_campaignId, amountToTransfer);
        } else {
            // Funds remain in the contract; each backer withdraws their own share via refund()
            emit CampaignClosed(_campaignId, 0);
        }
    }

    /// @notice Claim your contribution back from a closed campaign that didn't reach its goal
    function refund(uint256 _campaignId) public {
        Campaign storage campaign = idToCampaign[_campaignId];
        if (campaign.id == 0) revert NotExists(_campaignId);
        if (!campaign.closed) revert CampaignStillOpen(_campaignId);
        if (campaign.goalReached) revert NoRefundAvailable(_campaignId);

        uint256 amount = votes[msg.sender][_campaignId];
        if (amount == 0) revert NotEnoughEth(0);

        votes[msg.sender][_campaignId] = 0;
        campaign.balance -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert FailedTransaction();

        emit Refunded(_campaignId, msg.sender, amount);
    }

    /// @notice Allows contract owner to claim accumulated platform fees (1% of successfully closed campaigns)
    function claimFunds() public onlyOwner {
        uint256 amountToClaim = fundsToClaim;
        fundsToClaim = 0;
        if (amountToClaim == 0) revert NothingToClaim();

        (bool success, ) = payable(owner).call{value: amountToClaim}("");
        if (!success) revert FailedTransaction();

        emit FundsClaimed(amountToClaim);
    }

    function getCampaign(uint256 _campaignId) public view returns (Campaign memory) {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);
        return idToCampaign[_campaignId];
    }

    function getFundsToClaim() public view returns (uint256) {
        return fundsToClaim;
    }
}