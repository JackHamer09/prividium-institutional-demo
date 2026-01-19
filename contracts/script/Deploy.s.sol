// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RepoContract.sol";
import "../src/TestnetERC20Token.sol";
import {L2_NATIVE_TOKEN_VAULT_ADDR} from "era-contracts/l1-contracts/contracts/common/l2-helpers/L2ContractAddresses.sol";

interface IL2NativeTokenVault {
    function ensureTokenIsRegistered(address _nativeToken) external returns (bytes32);
}

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy RepoContract
        RepoContract repoContract = new RepoContract(admin);
        console.log("Intraday Repo deployed at:", address(repoContract));

        // Fund RepoContract with ETH if REPO_FUND_AMOUNT is set
        uint256 repoFundAmount = vm.envOr("REPO_FUND_AMOUNT", uint256(0));
        if (repoFundAmount > 0) {
            (bool success,) = address(repoContract).call{value: repoFundAmount}("");
            require(success, "Failed to fund RepoContract");
            console.log("RepoContract funded with:", repoFundAmount);
        }

        // Optionally deploy test tokens (set DEPLOY_TEST_TOKENS=true in .env)
        bool deployTestTokens = vm.envOr("DEPLOY_TEST_TOKENS", false);

        if (deployTestTokens) {
            // Deploy USDC (6 decimals)
            TestnetERC20Token usdc = new TestnetERC20Token("USD Coin", "USDC", 6);
            console.log("USDC deployed at:", address(usdc));

            // Deploy TUST (18 decimals)
            TestnetERC20Token tust = new TestnetERC20Token("Tokenized US Treasuries", "TUST", 18);
            console.log("TUST deployed at:", address(tust));

            // Deploy SGD (18 decimals)
            TestnetERC20Token sgd = new TestnetERC20Token("Singapore Dollar", "SGD", 18);
            console.log("SGD deployed at:", address(sgd));

            // Register tokens with Native Token Vault
            IL2NativeTokenVault vault = IL2NativeTokenVault(L2_NATIVE_TOKEN_VAULT_ADDR);

            bytes32 usdcAssetId = vault.ensureTokenIsRegistered(address(usdc));
            console.log("USDC registered, asset ID:");
            console.logBytes32(usdcAssetId);

            bytes32 tustAssetId = vault.ensureTokenIsRegistered(address(tust));
            console.log("TUST registered, asset ID:");
            console.logBytes32(tustAssetId);

            bytes32 sgdAssetId = vault.ensureTokenIsRegistered(address(sgd));
            console.log("SGD registered, asset ID:");
            console.logBytes32(sgdAssetId);
        }

        vm.stopBroadcast();
    }
}
