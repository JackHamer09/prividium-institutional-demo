# Intraday Repo User Guide

## Overview

Intraday Repo is a short-term collateralized lending market where users can lend tokens for brief periods (minutes to hours) with collateral held in escrow. Borrowers receive immediate access to funds while lenders earn fees from the transaction.

## User Roles

### Lender
Creates lending offers by depositing tokens that borrowers can access in exchange for collateral. Earns fees when loans are repaid. Can claim borrower collateral if the loan defaults after the grace period expires.

### Borrower
Accepts lending offers by depositing collateral to receive the lent tokens immediately. Must repay the principal plus fee before the deadline to reclaim collateral.

## How to Use

### Creating a Lending Offer (Lender)

1. Click "Create Lending Offer" button
2. Set loan duration (options: 2 minutes, 30 minutes, 1 hour, 4 hours, 8 hours, 24 hours)
3. Set lender fee in basis points (1 bps = 0.01%)
4. Select token and amount to lend
5. Select required collateral token and amount
6. Approve token spending
7. Submit offer

Your tokens are deposited and locked. The offer appears in the "Available Offers" table for borrowers to accept.

### Borrowing (Borrower)

1. Browse "Available Offers" table
2. Review offer details:
   - Lending amount and token
   - Required collateral amount and token
   - Duration
   - Fee in basis points
3. Click "Borrow" on desired offer
4. Approve collateral token spending
5. Confirm transaction

You receive the lent tokens immediately. The offer moves to "My Active Offers" with a countdown timer showing time remaining until repayment deadline.

### Repaying a Loan (Borrower)

1. View active loan in "My Active Offers" section
2. Monitor countdown timer
3. Click "Repay" before deadline expires
4. Approve repayment amount (principal + fee)
5. Confirm transaction

Your collateral is returned after successful repayment. The transaction appears in the "History" tab with a "Completed" status.

### Claiming Collateral (Lender)

If a borrower fails to repay within the grace period:

1. Wait for countdown to show "Past due" status
2. Click "Claim" button in "My Active Offers"
3. Confirm transaction

You receive the borrower's collateral. The transaction appears in the "History" tab with a "Defaulted" status.

### Canceling an Offer (Lender)

For offers that have not been accepted:

1. Find your offer in "My Active Offers"
2. Click "Cancel"
3. Confirm transaction

Your deposited lending tokens are returned.

## Understanding the Interface

### Current Offers Tab

**My Active Offers Table**
Shows your ongoing transactions as either lender or borrower:
- Offers you created that are open (not yet accepted)
- Offers you accepted as borrower (active loans)
- Offers others accepted from you as lender (active loans)

**Available Offers Table**
Shows lending offers created by others that you can borrow from.

### History Tab

Shows completed, cancelled, and defaulted transactions. Includes filters for:
- Status: All, Completed, Cancelled, Defaulted
- Role: All, As Lender, As Borrower

### Offer Details Displayed

Each offer shows:
- **ID**: Unique offer number
- **Lending**: Token and amount being lent, with source chain
- **Collateral**: Required collateral token and amount, with source chain
- **Duration**: Length of loan period
- **Fee**: Lender fee in basis points and calculated token amount
- **Counterparty**: Address of the other party and their chain
- **Status**: Current state of the offer
- **Action**: Available action button

### Status Indicators

**Open** (blue): Offer created but not yet accepted by borrower

**Time remaining** (green): Active loan with countdown timer showing time left until deadline

**Grace period** (red): Borrower missed deadline but grace period (2 minutes) is active. Lender cannot claim yet.

**Past due** (red): Grace period expired. Lender can claim collateral.

**Completed** (blue): Loan repaid successfully

**Cancelled** (red): Offer cancelled by lender before acceptance

**Defaulted** (yellow): Borrower failed to repay and lender claimed collateral

## Grace Period

After the repayment deadline expires, borrowers have a 2-minute grace period to repay before lenders can claim collateral. During the grace period:
- Borrowers can still repay the loan
- Lenders see "In Grace Period" indicator
- Lenders cannot claim collateral yet

Once the grace period expires, the status changes to "Past due" and lenders can click "Claim" to receive the collateral.

## Token Balances Section

Located at the bottom of the page, this expandable section displays:
- All available token balances for your address
- "Mint" button to acquire test tokens for demonstration
- "Refresh" button to update displayed balances

Balances automatically refresh after transactions complete.

## Supported Tokens

- USDC (USD Coin)
- TTBILL (Tokenized Treasury Bill)
- SGD (Singapore Dollar)

## Duration Options

- 2 minutes
- 30 minutes
- 1 hour
- 4 hours
- 8 hours
- 24 hours

## Fee Structure

Fees are specified in basis points:
- 1 bps = 0.01%
- 100 bps = 1%
- Acceptable range: 0 to 10,000 bps

The calculated fee amount in tokens is displayed below the basis point input and in the offer details table.

## Real-time Updates

The interface updates automatically every second:
- Countdown timers recalculate continuously
- Status indicators change based on current time vs. deadline
- Grace period countdowns show remaining seconds/minutes
- Action buttons appear/disappear based on offer state and timing

## Transaction Flow Example

### Successful Loan Cycle

1. Lender creates offer: 100 USDC for 1 hour at 3 bps fee, requiring 105 TTBILL collateral
2. Offer appears in Available Offers table
3. Borrower accepts offer, deposits 105 TTBILL, receives 100 USDC
4. Offer moves to My Active Offers for both parties with 1-hour countdown
5. After 45 minutes, borrower clicks Repay
6. Borrower pays 100.03 USDC (principal + 0.03 USDC fee)
7. Borrower receives 105 TTBILL back
8. Transaction moves to History tab with "Completed" status

### Default Scenario

1. Lender creates offer: 100 USDC for 30 minutes at 5 bps fee, requiring 110 TTBILL collateral
2. Borrower accepts offer, deposits 110 TTBILL, receives 100 USDC
3. 30 minutes pass, countdown reaches zero
4. Status changes to show "Grace: 2m" with red indicator
5. Grace period expires after 2 additional minutes
6. Status changes to "Past due"
7. Lender clicks "Claim" button
8. Lender receives 110 TTBILL collateral
9. Transaction moves to History tab with "Defaulted" status