# Smart Contract Documentation

We are using hardhat with current package setup

```shell
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.13",
    "dotenv": "^16.5.0",
    "ethers": "^6.13.7",
    "hardhat": "^2.24.0"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^5.3.0"
  }
}
```

# Smart Contracts Deployment
- **IDRX** : Stable Token used for primary transaction at monsters 
( https://sepolia-blockscout.lisk.com/address/0x29960F35e33C6F380063bDcc4f2E82c46D5083AA?tab=contract )

- **CryptoMoon** : Smart Contract for indexing moonsters creature and stats 
( https://sepolia-blockscout.lisk.com/address/0xCc41b549b4A4d6217fE026f719dBaf960A72a7a1?tab=contract )

- **UserMoonManger** : Smart Contract for managing user moonster IDs, bookmarks, and interactions with BattleMoonManager and SeasonMoonManager. 
( https://sepolia-blockscout.lisk.com/address/0x5962c25f8c5934F85848e8BBdC3a9714b2EFd76A?tab=contract )

- **BattleMoonManager** : Smart Contract for managing battle rounds, matches, and rewards in the Moonsters system.
 ( https://sepolia-blockscout.lisk.com/address/0x8d637B649C2c99dE9D5513de975Be44ba6CD2a5a?tab=contract )

- **SeasonMoonManager** : Smart Contract for managing seasons, leaderboards, and rewards in the Moonsters system. 
( https://sepolia-blockscout.lisk.com/address/0xb58d136f63b59479d35B1f3c95935148485ce7CD?tab=contract )