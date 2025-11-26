// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {RepoContract} from "../src/RepoContract.sol";
import {TestnetERC20Token} from "../src/TestnetERC20Token.sol";

contract RepoContractTest is Test {
    RepoContract public repo;
    TestnetERC20Token public usdc;
    TestnetERC20Token public ttbill;

    address public admin = address(0x1);
    address public lender = address(0x2);
    address public borrower = address(0x3);
    address public other = address(0x4);

    uint256 constant LEND_AMOUNT = 1000e6; // 1000 USDC
    uint256 constant COLLATERAL_AMOUNT = 1e18; // 1 TTBILL
    uint256 constant DURATION = 1 hours;
    uint256 constant LENDER_FEE = 30; // 0.3% in basis points

    function setUp() public {
        // Deploy contracts
        repo = new RepoContract(admin);
        usdc = new TestnetERC20Token("USD Coin", "USDC", 6);
        ttbill = new TestnetERC20Token("Tokenized Treasury Bill", "TTBILL", 18);

        // Mint tokens
        usdc.mint(lender, 10000e6);
        ttbill.mint(borrower, 10e18);

        // Approve repo contract
        vm.prank(lender);
        usdc.approve(address(repo), type(uint256).max);

        vm.prank(borrower);
        ttbill.approve(address(repo), type(uint256).max);
    }

    function testCreateOffer() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        assertEq(offerId, 1);
        assertEq(repo.offerCounter(), 1);

        (
            uint256 id,
            address lenderAddr,
            address borrowerAddr,
            address lendToken,
            uint256 lendAmount,
            address collateralToken,
            uint256 collateralAmount,
            uint256 duration,
            uint256 startTime,
            uint256 endTime,
            uint256 lenderFee,
            RepoContract.OfferStatus status
        ) = repo.offers(offerId);

        assertEq(id, 1);
        assertEq(lenderAddr, lender);
        assertEq(borrowerAddr, address(0));
        assertEq(lendToken, address(usdc));
        assertEq(lendAmount, LEND_AMOUNT);
        assertEq(collateralToken, address(ttbill));
        assertEq(collateralAmount, COLLATERAL_AMOUNT);
        assertEq(duration, DURATION);
        assertEq(startTime, 0);
        assertEq(endTime, 0);
        assertEq(lenderFee, LENDER_FEE);
        assertEq(uint8(status), uint8(RepoContract.OfferStatus.Open));

        // Check lender's USDC balance decreased
        assertEq(usdc.balanceOf(lender), 9000e6);
        assertEq(usdc.balanceOf(address(repo)), LEND_AMOUNT);
    }

    function testCreateOfferInvalidParameters() public {
        vm.startPrank(lender);

        // Invalid lend token
        vm.expectRevert("Invalid lend token");
        repo.createOffer(address(0), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);

        // Invalid collateral token
        vm.expectRevert("Invalid collateral token");
        repo.createOffer(address(usdc), LEND_AMOUNT, address(0), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);

        // Zero lend amount
        vm.expectRevert("Lend amount must be greater than 0");
        repo.createOffer(address(usdc), 0, address(ttbill), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);

        // Zero collateral amount
        vm.expectRevert("Collateral amount must be greater than 0");
        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), 0, DURATION, LENDER_FEE);

        // Zero duration
        vm.expectRevert("Duration must be greater than 0");
        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, 0, LENDER_FEE);

        // Fee too high
        vm.expectRevert("Lender fee cannot exceed 100%");
        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, DURATION, 10001);

        vm.stopPrank();
    }

    function testAcceptOffer() public {
        // Create offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        uint256 borrowerUsdcBefore = usdc.balanceOf(borrower);
        uint256 borrowerTtbillBefore = ttbill.balanceOf(borrower);

        // Accept offer
        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Check offer state
        (, , address borrowerAddr, , , , , , uint256 startTime, uint256 endTime, , RepoContract.OfferStatus status) = repo.offers(offerId);
        assertEq(borrowerAddr, borrower);
        assertEq(uint8(status), uint8(RepoContract.OfferStatus.Active));
        assertEq(startTime, block.timestamp);
        assertEq(endTime, block.timestamp + DURATION);

        // Check balances
        assertEq(usdc.balanceOf(borrower), borrowerUsdcBefore + LEND_AMOUNT);
        assertEq(ttbill.balanceOf(borrower), borrowerTtbillBefore - COLLATERAL_AMOUNT);
        assertEq(ttbill.balanceOf(address(repo)), COLLATERAL_AMOUNT);
        assertEq(usdc.balanceOf(address(repo)), 0);
    }

    function testAcceptOfferNotOpen() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Try to accept again
        vm.prank(other);
        vm.expectRevert("Offer is not open");
        repo.acceptOffer(offerId);
    }

    function testLenderCannotBorrowOwnOffer() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        // Lender tries to accept own offer
        vm.prank(lender);
        vm.expectRevert("Lender cannot borrow own offer");
        repo.acceptOffer(offerId);
    }

    function testRepayLoan() public {
        // Create and accept offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Mint USDC for repayment (principal + fee)
        uint256 feeAmount = (LEND_AMOUNT * LENDER_FEE) / 10000;
        uint256 repaymentAmount = LEND_AMOUNT + feeAmount;
        usdc.mint(borrower, feeAmount);

        // Approve repayment
        vm.prank(borrower);
        usdc.approve(address(repo), repaymentAmount);

        uint256 lenderUsdcBefore = usdc.balanceOf(lender);
        uint256 borrowerTtbillBefore = ttbill.balanceOf(borrower);

        // Repay loan
        vm.prank(borrower);
        repo.repayLoan(offerId);

        // Check status
        (, , , , , , , , , , , RepoContract.OfferStatus status) = repo.offers(offerId);
        assertEq(uint8(status), uint8(RepoContract.OfferStatus.Completed));

        // Check balances
        assertEq(usdc.balanceOf(lender), lenderUsdcBefore + repaymentAmount);
        assertEq(ttbill.balanceOf(borrower), borrowerTtbillBefore + COLLATERAL_AMOUNT);
        assertEq(ttbill.balanceOf(address(repo)), 0);
        assertEq(usdc.balanceOf(address(repo)), 0);
    }

    function testRepayLoanOnlyBorrower() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Other user tries to repay
        vm.prank(other);
        vm.expectRevert("Only borrower can repay");
        repo.repayLoan(offerId);
    }

    function testClaimCollateral() public {
        // Create and accept offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Warp past deadline + grace period
        vm.warp(block.timestamp + DURATION + repo.gracePeriod() + 1);

        uint256 lenderTtbillBefore = ttbill.balanceOf(lender);

        // Claim collateral
        vm.prank(lender);
        repo.claimCollateral(offerId);

        // Check status
        (, , , , , , , , , , , RepoContract.OfferStatus status) = repo.offers(offerId);
        assertEq(uint8(status), uint8(RepoContract.OfferStatus.Defaulted));

        // Check balances
        assertEq(ttbill.balanceOf(lender), lenderTtbillBefore + COLLATERAL_AMOUNT);
        assertEq(ttbill.balanceOf(address(repo)), 0);
    }

    function testCannotClaimCollateralDuringGracePeriod() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        // Warp to just after deadline (still in grace period)
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(lender);
        vm.expectRevert("Loan still in grace period");
        repo.claimCollateral(offerId);
    }

    function testClaimCollateralOnlyLender() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        vm.warp(block.timestamp + DURATION + repo.gracePeriod() + 1);

        // Other user tries to claim
        vm.prank(other);
        vm.expectRevert("Only lender can claim collateral");
        repo.claimCollateral(offerId);
    }

    function testCancelOffer() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        uint256 lenderUsdcBefore = usdc.balanceOf(lender);

        // Cancel offer
        vm.prank(lender);
        repo.cancelOffer(offerId);

        // Check status
        (, , , , , , , , , , , RepoContract.OfferStatus status) = repo.offers(offerId);
        assertEq(uint8(status), uint8(RepoContract.OfferStatus.Cancelled));

        // Check balance returned
        assertEq(usdc.balanceOf(lender), lenderUsdcBefore + LEND_AMOUNT);
        assertEq(usdc.balanceOf(address(repo)), 0);
    }

    function testCancelOfferOnlyLender() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(other);
        vm.expectRevert("Only lender can cancel offer");
        repo.cancelOffer(offerId);
    }

    function testCannotCancelAcceptedOffer() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        vm.prank(lender);
        vm.expectRevert("Offer is not open");
        repo.cancelOffer(offerId);
    }

    function testCalculateRepaymentAmount() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        uint256 totalAmount = repo.calculateRepaymentAmount(offerId);
        uint256 expectedFee = (LEND_AMOUNT * LENDER_FEE) / 10000;
        assertEq(totalAmount, LEND_AMOUNT + expectedFee);
    }

    function testGetOpenOffers() public {
        vm.startPrank(lender);

        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);
        repo.createOffer(address(usdc), LEND_AMOUNT * 2, address(ttbill), COLLATERAL_AMOUNT * 2, DURATION * 2, LENDER_FEE * 2);

        vm.stopPrank();

        RepoContract.RepoOffer[] memory offers = repo.getOpenOffers();
        assertEq(offers.length, 2);
        assertEq(offers[0].offerId, 1);
        assertEq(offers[1].offerId, 2);
    }

    function testGetLenderOffers() public {
        vm.prank(lender);
        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);

        // Setup other account
        usdc.mint(other, 10000e6);
        vm.prank(other);
        usdc.approve(address(repo), type(uint256).max);

        vm.prank(other);
        repo.createOffer(address(usdc), LEND_AMOUNT, address(ttbill), COLLATERAL_AMOUNT, DURATION, LENDER_FEE);

        RepoContract.RepoOffer[] memory lenderOffers = repo.getLenderOffers(lender);
        assertEq(lenderOffers.length, 1);
        assertEq(lenderOffers[0].lender, lender);

        RepoContract.RepoOffer[] memory otherOffers = repo.getLenderOffers(other);
        assertEq(otherOffers.length, 1);
        assertEq(otherOffers[0].lender, other);
    }

    function testGetBorrowerOffers() public {
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(usdc),
            LEND_AMOUNT,
            address(ttbill),
            COLLATERAL_AMOUNT,
            DURATION,
            LENDER_FEE
        );

        vm.prank(borrower);
        repo.acceptOffer(offerId);

        RepoContract.RepoOffer[] memory borrowerOffers = repo.getBorrowerOffers(borrower);
        assertEq(borrowerOffers.length, 1);
        assertEq(borrowerOffers[0].borrower, borrower);
    }

    function testSetGracePeriod() public {
        uint256 newGracePeriod = 5 minutes;

        vm.prank(admin);
        repo.setGracePeriod(newGracePeriod);

        assertEq(repo.gracePeriod(), newGracePeriod);
    }

    function testSetGracePeriodOnlyAdmin() public {
        vm.prank(lender);
        vm.expectRevert("Only admin can perform this action");
        repo.setGracePeriod(5 minutes);
    }

    function testSetAdmin() public {
        address newAdmin = address(0x5);

        vm.prank(admin);
        repo.setAdmin(newAdmin);

        assertEq(repo.admin(), newAdmin);
    }

    function testSetAdminOnlyAdmin() public {
        vm.prank(lender);
        vm.expectRevert("Only admin can perform this action");
        repo.setAdmin(address(0x5));
    }

    function testSetAdminZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("New admin cannot be zero address");
        repo.setAdmin(address(0));
    }
}
