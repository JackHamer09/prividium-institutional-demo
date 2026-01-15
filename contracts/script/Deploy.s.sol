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
        console.log("RepoContract deployed at:", address(repoContract));

        // Optionally deploy test tokens (set DEPLOY_TEST_TOKENS=true in .env)
        bool deployTestTokens = vm.envOr("DEPLOY_TEST_TOKENS", false);

        if (deployTestTokens) {
            // Deploy USDC (6 decimals)
            TestnetERC20Token usdc = new TestnetERC20Token("USD Coin", "USDC", 6);
            console.log("USDC deployed at:", address(usdc));

            // Deploy TTBILL (18 decimals)
            TestnetERC20Token ttbill = new TestnetERC20Token("Tokenized Treasury Bill", "TTBILL", 18);
            console.log("TTBILL deployed at:", address(ttbill));

            // Deploy SGD (18 decimals)
            TestnetERC20Token sgd = new TestnetERC20Token("Singapore Dollar", "SGD", 18);
            console.log("SGD deployed at:", address(sgd));

            // Register tokens with Native Token Vault
            IL2NativeTokenVault vault = IL2NativeTokenVault(L2_NATIVE_TOKEN_VAULT_ADDR);

            bytes32 usdcAssetId = vault.ensureTokenIsRegistered(address(usdc));
            console.log("USDC registered, asset ID:");
            console.logBytes32(usdcAssetId);

            bytes32 ttbillAssetId = vault.ensureTokenIsRegistered(address(ttbill));
            console.log("TTBILL registered, asset ID:");
            console.logBytes32(ttbillAssetId);

            bytes32 sgdAssetId = vault.ensureTokenIsRegistered(address(sgd));
            console.log("SGD registered, asset ID:");
            console.logBytes32(sgdAssetId);
        }

        vm.stopBroadcast();
    }
}
