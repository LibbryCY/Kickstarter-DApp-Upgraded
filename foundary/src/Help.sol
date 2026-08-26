// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

/// @title Kickstarter Campaign Contract Old version
/// @author Lazar
/// @notice This contract allows users to create fundraising campaigns, vote with ETH, unvote, and claim funds.
/// @dev Uses custom errors and emits events for off-chain tracking. ETH is stored per campaign.

struct Campaign {
    uint256 id; ///< Unique campaign identifier
    address creator; ///< Address of campaign creator
    uint256 threshold; ///< ETH funding goal (in wei)
    uint256 balance; ///< Current balance of the campaign
    address beneficiary; ///< Recipient if goal is reached
    uint256 numberOfVotes; ///< Total number of contributions
    bool closed; ///< Whether the campaign is closed
}

contract Kickstarter {
    /// @dev Reverts when campaign does not exist
    error NotExists(uint256 campaignId);
    /// @dev Reverts when function is called by someone other than the contract owner
    error NotOwner();
    /// @dev Reverts when function is called by someone other than campaign creator
    error NotCreator();
    /// @dev Reverts when user tries to vote again (commented logic)
    error AlreadyVoted(uint256 campaignId);
    /// @dev Reverts when ETH amount sent is 0 or insufficient
    error NotEnoughEth(uint256 amount);
    /// @dev Reverts when ETH transfer fails
    error FailedTransaction();
    /// @dev Reverts if campaign is already closed
    error ClosedCampaign(uint256 amount);
    /// @dev Reverts when campaign goal is not reached
    error GoalNotReached(uint256 balance, uint256 threshold);
    /// @dev Reverts if there's no ETH available to claim
    error NothingToClaim();

    /// @notice ID to be assigned to the next campaign
    uint256 public nextId = 1;

    /// @notice Contract owner (immutable)
    address public immutable owner;

    /// @notice Amount of ETH available for the owner to claim
    uint256 public fundsToClaim = 0;

    /// @notice Initializes contract and sets the owner
    constructor() {
        owner = msg.sender;
    }

    /// @notice Maps campaign ID to campaign details
    mapping(uint256 => Campaign) public idToCampaign;

    /// @notice Tracks ETH voted by each address per campaign
    mapping(address voter => mapping(uint256 campId => uint256 amount))
        public votes;

    /// @notice Emitted when a new campaign is created
    event CampaignCreated(
        uint256 campaignId,
        address creator,
        uint256 threshold,
        address beneficiary
    );

    /// @notice Emitted when a user votes (sends ETH) to a campaign
    event Voted(
        uint256 indexed campaignId,
        address indexed voter,
        uint256 amount
    );

    /// @notice Emitted when a user unvotes (withdraws ETH)
    event Unvoted(
        uint256 indexed campaignId,
        address indexed voter,
        uint256 amount
    );

    /// @notice Emitted when a campaign is closed
    event CampaignClosed(uint256 indexed campaignId, uint256 amountTransferred);

    /// @notice Emitted when the owner claims leftover funds
    event FundsClaimed(uint256 fundsToClaim);

    /// @dev Modifier to restrict to the campaign creator
    modifier onlyCreator(uint256 _campaignId) {
        if (idToCampaign[_campaignId].creator != msg.sender)
            revert NotCreator();
        _;
    }

    /// @dev Modifier to restrict to the contract owner
    modifier onlyOwner() {
        if (owner != msg.sender) revert NotOwner();
        _;
    }

    /// @notice Create a new fundraising campaign
    /// @param minEthThreshold Minimum ETH needed (in wei) to succeed
    /// @param _beneficiary Address to receive funds if goal is reached
    function createCampaign(
        uint256 minEthThreshold,
        address _beneficiary
    ) public {
        Campaign memory newCampaign = Campaign({
            id: nextId,
            creator: msg.sender,
            balance: 0,
            threshold: minEthThreshold,
            beneficiary: _beneficiary,
            numberOfVotes: 0,
            closed: false
        });

        idToCampaign[nextId] = newCampaign;

        emit CampaignCreated(nextId, msg.sender, minEthThreshold, _beneficiary);

        nextId++;
    }

    /// @notice Vote (donate ETH) to a campaign
    /// @param _campaignId ID of the campaign to support
    /// @dev Closes the campaign automatically if threshold is reached
    function vote(uint256 _campaignId) public payable {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);

        if (idToCampaign[_campaignId].closed)
            revert ClosedCampaign(_campaignId);

        if (msg.value == 0) revert NotEnoughEth(msg.value);

        votes[msg.sender][_campaignId] += msg.value;
        idToCampaign[_campaignId].balance += msg.value;
        idToCampaign[_campaignId].numberOfVotes++;

        emit Voted(_campaignId, msg.sender, msg.value);

        if (
            idToCampaign[_campaignId].balance >=
            idToCampaign[_campaignId].threshold
        ) {
            closeCampaign(_campaignId);
        }
    }

    /// @notice Withdraw your vote (ETH) from an open campaign
    /// @param _campaignId ID of the campaign to unvote
    function unvote(uint256 _campaignId) public {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);

        if (idToCampaign[_campaignId].closed)
            revert ClosedCampaign(_campaignId);

        uint256 amountToUnvote = votes[msg.sender][_campaignId];
        if (amountToUnvote == 0) revert NotEnoughEth(0);

        votes[msg.sender][_campaignId] = 0;
        idToCampaign[_campaignId].balance -= amountToUnvote;
        idToCampaign[_campaignId].numberOfVotes--;

        (bool success, ) = payable(msg.sender).call{value: amountToUnvote}("");
        if (!success) revert FailedTransaction();

        emit Unvoted(_campaignId, msg.sender, amountToUnvote);
    }

    /// @notice Allows the creator to manually close their campaign
    /// @param _campaignId Campaign to close
    function creatorOnlyCloseCampaign(
        uint256 _campaignId
    ) public onlyCreator(_campaignId) {
        closeCampaign(_campaignId);
    }

    /// @dev Internal function to close a campaign and transfer funds to beneficiary if threshold met
    /// @param _campaignId ID of the campaign
    function closeCampaign(uint256 _campaignId) private {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);

        if (idToCampaign[_campaignId].closed)
            revert ClosedCampaign(_campaignId);

        idToCampaign[_campaignId].closed = true;
        Campaign storage campaign = idToCampaign[_campaignId];
        uint256 amountToTransfer = 0;

        if (campaign.balance < campaign.threshold) {
            fundsToClaim += campaign.balance;
            campaign.balance = 0;
        } else {
            amountToTransfer = campaign.balance;
            campaign.balance = 0;

            (bool success, ) = payable(campaign.beneficiary).call{
                value: amountToTransfer
            }("");
            if (!success) revert FailedTransaction();
        }

        emit CampaignClosed(_campaignId, amountToTransfer);
    }

    /// @notice Allows contract owner to claim all unused funds
    function claimFunds() public onlyOwner {
        uint256 amountToClaim = fundsToClaim;
        fundsToClaim = 0;
        if (amountToClaim == 0) revert NothingToClaim();

        (bool success, ) = payable(owner).call{value: amountToClaim}("");
        if (!success) revert FailedTransaction();

        emit FundsClaimed(amountToClaim);
    }

    /// @notice Returns campaign details
    /// @param _campaignId ID of the campaign
    /// @return Campaign structure
    function getCampaign(
        uint256 _campaignId
    ) public view returns (Campaign memory) {
        if (idToCampaign[_campaignId].id == 0) revert NotExists(_campaignId);
        return idToCampaign[_campaignId];
    }

    /// @notice Returns total ETH available for owner to claim
    /// @return ETH amount (in wei)
    function getFundsToClaim() public view returns (uint256) {
        return fundsToClaim;
    }
}
