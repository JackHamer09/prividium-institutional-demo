// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RepoContract.sol";
import "../src/TestnetERC20Token.sol";

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

            // Deploy TUST (18 decimals)
            TestnetERC20Token tust = new TestnetERC20Token("Tokenized US Treasuries", "TUST", 18);
            console.log("TUST deployed at:", address(tust));

            // Deploy SGD (18 decimals)
            TestnetERC20Token sgd = new TestnetERC20Token("Singapore Dollar", "SGD", 18);
            console.log("SGD deployed at:", address(sgd));
        }

        vm.stopBroadcast();
    }
}
