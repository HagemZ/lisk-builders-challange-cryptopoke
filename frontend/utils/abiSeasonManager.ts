export const abiSeasonManager = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_initialToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_decimals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_baseFee",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_supportsPermit",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_image_url",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_userManager",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_battleManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "wins",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "draws",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lossesOrOrphans",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
      }
    ],
    "name": "LeaderboardSnapshot",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endRoundId",
        "type": "uint256"
      }
    ],
    "name": "SeasonEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "baseRewards",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "label",
        "type": "string"
      }
    ],
    "name": "SeasonInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "label",
        "type": "string"
      }
    ],
    "name": "SeasonLabelUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "name": "SeasonRewardHashSaved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "TokenAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "TokenRemoved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_decimals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_baseFee",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_supportsPermit",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_image_url",
        "type": "string"
      }
    ],
    "name": "addAcceptedToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "battleManager",
    "outputs": [
      {
        "internalType": "contract IBattleMoonManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentSeasonId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endSeason",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      }
    ],
    "name": "getBaseFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentSeasonId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentSeasonRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      }
    ],
    "name": "getDecimals",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      }
    ],
    "name": "getFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "baseFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bookmarkFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "evolutionFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "wins",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "draws",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lossesOrOrphans",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "points",
            "type": "uint256"
          }
        ],
        "internalType": "struct SeasonMoonManager.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      }
    ],
    "name": "getSeason",
    "outputs": [
      {
        "internalType": "string",
        "name": "state",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "startRoundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endRoundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "baseRewards",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalGames",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      }
    ],
    "name": "getSeasonLabel",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_seasonId",
        "type": "uint256"
      }
    ],
    "name": "getSeasonRewardHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      }
    ],
    "name": "getTopPlayers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_baseRewards",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_label",
        "type": "string"
      }
    ],
    "name": "initializeSeason",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxRoundsResult",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "seasonId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxRoundId",
            "type": "uint256"
          }
        ],
        "internalType": "struct SeasonMoonManager.MaxRoundResult[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      }
    ],
    "name": "removeAcceptedToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_seasonId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_hash",
        "type": "bytes32"
      }
    ],
    "name": "saveSeasonRewardHashLink",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "seasonLabels",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "seasonLeaderboards",
    "outputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "wins",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "draws",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lossesOrOrphans",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "seasonRewardHashes",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "seasons",
    "outputs": [
      {
        "internalType": "string",
        "name": "state",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "startRoundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endRoundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "baseRewards",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalGames",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_battleManager",
        "type": "address"
      }
    ],
    "name": "setBattleManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_label",
        "type": "string"
      }
    ],
    "name": "setSeasonLabel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_userManager",
        "type": "address"
      }
    ],
    "name": "setUserManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "tokenDetails",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isAccepted",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "decimals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "baseFee",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "supportsPermit",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "image_url",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_newBaseFee",
        "type": "uint256"
      }
    ],
    "name": "updateBaseFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player1",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "player2",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "orphan",
        "type": "address"
      }
    ],
    "name": "updateLeaderboard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seasonId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "additionalGames",
        "type": "uint256"
      }
    ],
    "name": "updateSeasonGames",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "usedSignatures",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "userListLength",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "userManager",
    "outputs": [
      {
        "internalType": "contract UserMoonManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      }
    ],
    "name": "withdrawTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;