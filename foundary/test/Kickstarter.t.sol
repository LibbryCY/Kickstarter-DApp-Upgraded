// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Kickstarter.sol"; // Adjust the path to your Kickstarter.sol file
import {Campaign} from "../src/Kickstarter.sol";

contract RejectingContract {
    fallback() external payable {
        revert();
    }
}

contract KickstarterTest is Test {
    Kickstarter public kickstarter;
    address public user = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address public owner = address(this);

    function setUp() public {
        // Deploy the Kickstarter contract before each test
        kickstarter = new Kickstarter();

        // Fund the user with some ETH
        vm.deal(user, 10 ether);
        vm.deal(owner, 10 ether);
    }

    function testContractDeployed() public view {
        assertTrue(
            address(kickstarter) != address(0),
            "Kickstarter contract should be deployed"
        );
        assertEq(
            kickstarter.nextId(),
            1,
            "Kickstarter contract should be deployed with the correct nextId"
        );
    }

    function testCreateCampaign() public {
        vm.prank(owner);
        kickstarter.createCampaign(1 ether, owner, false);

        Campaign memory campaign = kickstarter.getCampaign(1);
        console.log(
            "Campaign ID: %s, Balance: %s, Closed: %s",
            campaign.id,
            campaign.balance,
            campaign.closed
        );

        assertEq(campaign.id, 1, "Campaign ID mismatch");
        assertEq(campaign.threshold, 1 ether, "Target amount mismatch");
        assertEq(campaign.balance, 0, "Initial balance should be 0");
        assertEq(campaign.creator, owner, "Owner address mismatch");
        assertFalse(campaign.closed, "Campaign should be open initially");

        assertEq(
            kickstarter.nextId(),
            2,
            "Kickstarter contract should be increase nextId"
        );
    }

    function testEmitCampainCreated() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Kickstarter.CampaignCreated(1, owner, 1 ether, owner, false);
        kickstarter.createCampaign(1 ether, owner, false);
    }

    // Testing vote lines

    function testVoteNotExists() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotExists.selector, 1)
        );

        //vm.expectRevert(Kickstarter.NotExists.selector);
        kickstarter.vote{value: 0.5 ether}(1);
    }

    function testVoteNotEnoughEth() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotEnoughEth.selector, 0)
        );
        //vm.expectRevert(Kickstarter.NotEnoughEth.selector);
        kickstarter.vote{value: 0 ether}(1);
    }

    function testVoteClosedCampaign() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.ClosedCampaign.selector, 1)
        );

        kickstarter.vote{value: 0.5 ether}(1);
    }

    function testVote() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 0.5 ether}(1);

        Campaign memory campaign = kickstarter.getCampaign(1);

        assertEq(campaign.balance, 0.5 ether, "Campaign balance correct");
        assertEq(campaign.numberOfVotes, 1, "Number of votes correct");
        assertEq(
            kickstarter.votes(user, 1),
            0.5 ether,
            "User's vote amount correct"
        );
    }

    function testVotedEmit() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit Kickstarter.Voted(1, user, 0.5 ether);
        kickstarter.vote{value: 0.5 ether}(1);
    }

    // Test unvote lines

    function testUnvoteNotExists() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotExists.selector, 1)
        );
        kickstarter.unvote(1);
    }

    function testUnvoteNotEnoughEth() public {
        vm.prank(owner);
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotEnoughEth.selector, 0)
        );
        kickstarter.unvote(1);
    }

    function testUnvoteClosedCampaign() public {
        kickstarter.createCampaign(1 ether, owner,false);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.ClosedCampaign.selector, 1)
        );
        kickstarter.unvote(1);
    }

    function testUnvote() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 0.5 ether}(1);

        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        kickstarter.unvote(1);

        Campaign memory campaign = kickstarter.getCampaign(1);

        assertEq(campaign.balance, 0, "Campaign balance should be 0");
        assertEq(
            user.balance,
            userBalanceBefore + 0.5 ether,
            "ETH should be returned to user"
        );
    }

    // receive() external payable {
    //     revert("This contract cannot receive ETH");
    // }

    // function testUnvoteFailedTransaction() public {
    //     vm.prank(owner);
    //     kickstarter.createCampaign(2 ether, owner);

    //     vm.prank(address(this));
    //     kickstarter.vote{value: 1 ether}(1);

    //     vm.prank(address(this));
    //     vm.expectRevert(Kickstarter.FailedTransaction.selector);
    //     kickstarter.unvote(1);
    // }

    function testUnvotedEmit() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit Kickstarter.Voted(1, user, 0.5 ether);
        kickstarter.vote{value: 0.5 ether}(1);
    }

    // Test closeCamapaign lines

    function testCloseCampaignNotExists() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotExists.selector, 1)
        );
        kickstarter.creatorOnlyCloseCampaign(1);
    }

    function testCloseCampaignNotCreator() public {
        vm.prank(owner);
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotCreator.selector)
        );
        kickstarter.creatorOnlyCloseCampaign(1);
    }

    function testCloseCampaignClosedCampaign() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.ClosedCampaign.selector, 1)
        );
        kickstarter.creatorOnlyCloseCampaign(1);
    }

    function testCloseCampaignNotSuccess() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 0.5 ether}(1);

        // Close the campaign without reaching the threshold
        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        Campaign memory campaign = kickstarter.getCampaign(1);

        assertTrue(campaign.closed, "Campaign should be closed");
        assertEq(
            campaign.balance,
            0,
            "Campaign balance should be greater than 0"
        );
        assertEq(
            kickstarter.fundsToClaim(),
            0.5 ether,
            "Funds to claim should be 0.5 ether"
        );
    }

    function testCloseCampaignSuccess() public {
        address beneficiary = address(
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
        );
        vm.deal(beneficiary, 2 ether);

        vm.prank(owner);
        kickstarter.createCampaign(1 ether, beneficiary,false);

        vm.prank(user);
        kickstarter.vote{value: 2 ether}(1);

        Campaign memory campaign = kickstarter.getCampaign(1);

        assertTrue(campaign.closed, "Campaign should be closed.");
        assertEq(campaign.balance, 0, "Campaign balance should be 0");
        assertEq(kickstarter.fundsToClaim(), 0, "Funds to claim should be 0");
    }

    // function testCloseCampaignFailedTransaction() public {
    //     RejectingContract rejecting = new RejectingContract();

    //     vm.prank(owner);
    //     kickstarter.createCampaign(1 ether, address(rejecting));

    //     vm.prank(user);
    //     kickstarter.vote{value: 1 ether}(1);

    //     vm.prank(owner);
    //     vm.expectRevert(Kickstarter.FailedTransaction.selector);
    //     kickstarter.closeCampaign(1);
    // }

    function testEmitCampaignClosed() public {
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Kickstarter.CampaignClosed(1, 0);
        kickstarter.creatorOnlyCloseCampaign(1);
    }

    // Test claimFunds lines

    function testOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Kickstarter.NotOwner.selector));
        kickstarter.claimFunds();
    }

    function testClaimFundsNothingToClaim() public {
        vm.prank(owner);
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NothingToClaim.selector)
        );
        kickstarter.claimFunds();
    }

    receive() external payable {}

    function testClaimFunds() public {
        address beneficiary = address(
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
        );

        vm.prank(owner);
        kickstarter.createCampaign(2 ether, beneficiary, false);

        vm.prank(user);
        kickstarter.vote{value: 1 ether}(1);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        // Proverite fundsToClaim pre poziva
        uint256 preClaim = kickstarter.fundsToClaim();
        console.log("Pre claim:", preClaim);

        vm.prank(owner);
        kickstarter.claimFunds();

        Campaign memory campaign = kickstarter.getCampaign(1);
        assertTrue(campaign.closed, "Campaign should be closed.");
        assertEq(campaign.balance, 0, "Campaign balance should be 0");
        assertEq(
            kickstarter.fundsToClaim(),
            0 ether,
            "Funds to claim should be 0"
        );
    }

    function testEmitFundsClaimed() public {
        vm.prank(owner);
        kickstarter.createCampaign(2 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 1 ether}(1);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        console.log(
            "fundsToClaim before claimFunds:",
            kickstarter.fundsToClaim()
        );
        emit Kickstarter.FundsClaimed(kickstarter.fundsToClaim());
        kickstarter.claimFunds();
    }

    // Test getCampaign & getFundsToClaim lines

    function testGetCampaignNotExists() public {
        vm.expectRevert(
            abi.encodeWithSelector(Kickstarter.NotExists.selector, 1)
        );
        kickstarter.getCampaign(1);
    }

    function testGetCampaign() public {
        vm.prank(owner);
        kickstarter.createCampaign(1 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 0.5 ether}(1);

        Campaign memory campaign = kickstarter.getCampaign(1);
        assertEq(campaign.id, 1, "Campaign ID mismatch");
        assertEq(campaign.threshold, 1 ether, "Target amount mismatch");
        assertEq(campaign.balance, 0.5 ether, "Balance should be 0,5 ethers");
        assertEq(campaign.creator, owner, "Owner address mismatch");
        assertEq(campaign.numberOfVotes, 1, "Number of votes should be 1");
        assertFalse(campaign.closed, "Campaign should be closed");

        assertEq(
            kickstarter.votes(user, 1),
            0.5 ether,
            "User's vote amount should be 0.5 ether"
        );
    }

    function testGetFundsToClaim() public {
        vm.prank(owner);
        kickstarter.createCampaign(2 ether, owner, false);

        vm.prank(user);
        kickstarter.vote{value: 1 ether}(1);

        vm.prank(owner);
        kickstarter.creatorOnlyCloseCampaign(1);

        uint256 fundsToClaim = kickstarter.getFundsToClaim();
        assertEq(fundsToClaim, 1 ether, "Funds mismatch");
    }

    function test() public {}
}
