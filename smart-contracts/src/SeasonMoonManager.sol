// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CryptoMoonCore.sol";
import "./UserMoonManager.sol";
import "./IBattleMoonManager.sol";
import "hardhat/console.sol";

/**
 * @title SeasonMoonManager
 * @dev Contract for managing seasons, leaderboards, and rewards in the CryptoPoke system.
 * Inherits from CryptoMoonCore for token management functionality.
 */
contract SeasonMoonManager is CryptoMoonCore {
    /**
     * @dev Struct representing a season in the system.
     * - state: The current state of the season (e.g., "active", "ended").
     * - startRoundId: The starting round ID of the season.
     * - endRoundId: The ending round ID of the season, or 0 if not ended.
     * - baseRewards: The base reward amount per game in the season.
     * - totalGames: The total number of games played in the season.
     * - tokenAddress: The address of the token used for rewards.
     */
    struct Season {
        string state;
        uint256 startRoundId;
        uint256 endRoundId;
        uint256 baseRewards;
        uint256 totalGames;
        address tokenAddress;
    }

    /**
     * @dev Struct representing a leaderboard entry for a user in a season.
     * - user: The address of the user.
     * - wins: The number of wins for the user.
     * - draws: The number of draws for the user.
     * - lossesOrOrphans: The number of losses or orphan participations.
     * - points: The total points accumulated by the user.
     */
    struct LeaderboardEntry {
        address user;
        uint256 wins;
        uint256 draws;
        uint256 lossesOrOrphans;
        uint256 points;
    }

    /**
     * @dev Struct representing the maximum round ID for a season.additional ( 07052025 )
     * - seasonId: The ID of the season.
     * - maxRoundId: The latest round ID found for the season, or 0 if none.
     */
    struct MaxRoundResult {
        uint256 seasonId;
        uint256 maxRoundId;
    }

    /**
     * @dev Mapping of season ID to Season struct.
     */
    mapping(uint256 => Season) public seasons;

    /**
     * @dev The current season ID.
     */
    uint256 public currentSeasonId;

    /**
     * @dev Mapping of season ID to user address to LeaderboardEntry struct.
     */
    mapping(uint256 => mapping(address => LeaderboardEntry))
        public seasonLeaderboards;

    /**
     * @dev Mapping of season ID to season label.
     */
    mapping(uint256 => string) public seasonLabels;

    /**
     * @dev Mapping of season ID to reward hash for verification.
     */
    mapping(uint256 => bytes32) public seasonRewardHashes;

    /**
     * @dev Interface to the UserMoonManager contract for user data.
     */
    UserMoonManager public userManager;

    /**
     * @dev Interface to the BattleManager contract for battle data.
     */
    IBattleMoonManager public battleManager;

    /**
     * @dev Emitted when a new season is initialized.
     * @param seasonId The ID of the newly initialized season.
     * @param baseRewards The base reward amount per game.
     * @param tokenAddress The address of the token used for rewards.
     * @param label The label or name of the season.
     */
    event SeasonInitialized(
        uint256 indexed seasonId,
        uint256 baseRewards,
        address tokenAddress,
        string label
    );

    /**
     * @dev Emitted when a season ends.
     * @param seasonId The ID of the ended season.
     * @param endRoundId The final round ID of the season.
     */
    event SeasonEnded(uint256 indexed seasonId, uint256 endRoundId);

    /**
     * @dev Emitted when a season ends.
     * @param seasonId The ID of the ended season.
     * @param user The user on leaderboard at the end of the season.
     * @param wins The wins on leaderboard at the end of the season
     * @param draws The draws round ID of the season.
     * @param lossesOrOrphans The lossesOrOrphans round ID of the season.
     * @param points The final points at user at the end of season.
     */
    event LeaderboardSnapshot(
        uint256 indexed seasonId,
        address indexed user,
        uint256 wins,
        uint256 draws,
        uint256 lossesOrOrphans,
        uint256 points
    );

    /**
     * @dev Emitted when a season label is updated.
     * @param seasonId The ID of the season whose label was updated.
     * @param label The new label for the season.
     */
    event SeasonLabelUpdated(uint256 indexed seasonId, string label);

    /**
     * @dev Emitted when a season reward hash is saved.
     * @param seasonId The ID of the season for which the hash was saved.
     * @param hash The reward hash saved.
     */
    event SeasonRewardHashSaved(uint256 indexed seasonId, bytes32 hash);

    /**
     * @dev Constructor to initialize the contract with an initial token and manager interfaces.
     * @param _initialToken The address of the initial accepted token.
     * @param _decimals The number of decimal places for the initial token.
     * @param _baseFee The base fee for transactions using the initial token.
     * @param _supportsPermit Whether the initial token supports EIP-2612 permit.
     * @param _symbol The symbol of the initial token (e.g., "USDT").
     * @param _image_url The URL to an image representing the initial token.
     * @param _owner The address to set as the owner of the contract.
     * @param _userManager The address of the UserMoonManager contract.
     * @param _battleManager The address of the BattleManager contract.
     */
    constructor(
        address _initialToken,
        uint256 _decimals,
        uint256 _baseFee,
        bool _supportsPermit,
        string memory _symbol,
        string memory _image_url,
        address _owner,
        address _userManager,
        address _battleManager
    )
        CryptoMoonCore(
            _initialToken,
            _decimals,
            _baseFee,
            _supportsPermit,
            _symbol,
            _image_url,
            _owner
        )
    {
        userManager = UserMoonManager(_userManager);
        battleManager = IBattleMoonManager(_battleManager);
        currentSeasonId = 0;
    }

    /**
     * @dev Sets the address of the UserMoonManager contract.
     * Only the owner can call this function.
     * @param _userManager The new UserMoonManager contract address.
     */
    function setUserManager(address _userManager) external onlyOwner {
        console.log("SeasonManager: Setting UserMoonManager to: %s", _userManager);
        require(
            _userManager != address(0),
            "UserMoonManager address cannot be zero"
        );
        userManager = UserMoonManager(_userManager);
    }

    /**
     * @dev Sets the address of the BattleManager contract.
     * Only the owner can call this function.
     * @param _battleManager The new BattleManager contract address.
     */
    function setBattleManager(address _battleManager) external onlyOwner {
        console.log(
            "SeasonManager: Setting battleManager to: %s",
            _battleManager
        );
        require(
            _battleManager != address(0),
            "BattleManager address cannot be zero"
        );
        battleManager = IBattleMoonManager(_battleManager);
    }

    /**
     * @dev Initializes a new season with specified parameters.
     * Only the owner can call this function.
     * @param _baseRewards The base reward amount per game.
     * @param _tokenAddress The address of the token to use for rewards.
     * @param _label The label or name for the season.
     */
    function initializeSeason(
        uint256 _baseRewards,
        address _tokenAddress,
        string memory _label
    ) external onlyOwner {
        require(
            currentSeasonId == 0 ||
                keccak256(abi.encodePacked(seasons[currentSeasonId].state)) ==
                keccak256(abi.encodePacked("ended")),
            "Current season must be ended to initialize a new one"
        );
        require(
            tokenDetails[_tokenAddress].isAccepted,
            "Token is not accepted"
        );
        currentSeasonId++;
        seasons[currentSeasonId] = Season({
            state: "active",
            startRoundId: address(battleManager) != address(0)
                ? battleManager.getCurrentRoundId() + 1
                : 1,
            endRoundId: 0,
            baseRewards: _baseRewards,
            totalGames: 0,
            tokenAddress: _tokenAddress
        });
        seasonLabels[currentSeasonId] = _label;

        // if (currentSeasonId > 1) {
        //     uint256 previousSeasonId = currentSeasonId - 1;
        //     uint256 offset = 0;
        //     uint256 limit = 100;
        //     uint256 totalUsers = UserMoonManager.userListLength();

        //     while (offset < totalUsers) {
        //         (address[] memory users, ) = UserMoonManager.getUsers(
        //             offset,
        //             limit
        //         );
        //         for (uint256 i = 0; i < users.length; i++) {
        //             address user = users[i];
        //             seasonLeaderboards[previousSeasonId][
        //                 user
        //             ] = LeaderboardEntry(user, 0, 0, 0, 0);
        //         }
        //         offset += users.length;
        //     }
        // }

        if (address(battleManager) != address(0)) {
            battleManager.resetRoundCounter();
        }

        emit SeasonInitialized(
            currentSeasonId,
            _baseRewards,
            _tokenAddress,
            _label
        );
    }

    /**
     * @dev Ends the current active season.
     * Only the owner can call this function.
     * Do the snapshot at the end of season.
     */
    function endSeason() external onlyOwner {
        require(
            keccak256(abi.encodePacked(seasons[currentSeasonId].state)) ==
                keccak256(abi.encodePacked("active")),
            "No active season"
        );
        seasons[currentSeasonId].state = "ended";
        seasons[currentSeasonId].endRoundId = address(battleManager) !=
            address(0)
            ? battleManager.getCurrentRoundId()
            : 0;

        // Emit leaderboard snapshot
        uint256 offset = 0;
        uint256 limit = 100;
        uint256 totalUsers = userManager.userListLength();
        while (offset < totalUsers) {
            (address[] memory users, ) = userManager.getUsers(offset, limit);
            for (uint256 i = 0; i < users.length; i++) {
                LeaderboardEntry storage entry = seasonLeaderboards[
                    currentSeasonId
                ][users[i]];
                emit LeaderboardSnapshot(
                    currentSeasonId,
                    users[i],
                    entry.wins,
                    entry.draws,
                    entry.lossesOrOrphans,
                    entry.points
                );
            }
            offset += users.length;
        }
        emit SeasonEnded(currentSeasonId, seasons[currentSeasonId].endRoundId);
    }

    /**
     * @dev Retrieves a paginated leaderboard for a specific season.
     * @param seasonId The ID of the season to query.
     * @param offset The starting index of the user list.
     * @param limit The maximum number of entries to return.
     * @return An array of LeaderboardEntry structs sorted by points in descending order.
     */
    function getLeaderboard(
        uint256 seasonId,
        uint256 offset,
        uint256 limit
    ) external view returns (LeaderboardEntry[] memory) {
        require(
            seasonId > 0 && seasonId <= currentSeasonId,
            "Invalid season ID"
        );
        (address[] memory users, ) = userManager.getUsers(offset, limit);
        uint256 length = users.length;
        LeaderboardEntry[] memory entries = new LeaderboardEntry[](length);
        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            LeaderboardEntry storage entry = seasonLeaderboards[seasonId][user];
            if (entry.user == address(0)) {
                entries[i] = LeaderboardEntry(user, 0, 0, 0, 0);
            } else {
                entries[i] = entry;
            }
        }
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (entries[j].points < entries[j + 1].points) {
                    LeaderboardEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }
        return entries;
    }

    /**
     * @dev Retrieves the top players for a specific season based on points.
     * @param seasonId The ID of the season to query.
     * @param limit The maximum number of top players to return.
     * @param offset The starting index of the user list.
     * @return An array of addresses of the top players.
     */
    function getTopPlayers(
        uint256 seasonId,
        uint256 limit,
        uint256 offset
    ) public view returns (address[] memory) {
        require(
            seasonId > 0 && seasonId <= currentSeasonId,
            "Invalid season ID"
        );
        (address[] memory users, ) = userManager.getUsers(offset, limit);
        uint256 totalUsers = users.length;
        require(totalUsers > 0, "No users available");
        require(offset < totalUsers, "Offset out of bounds");

        uint256 length = totalUsers < (offset + limit)
            ? totalUsers - offset
            : limit;
        address[] memory topUsers = new address[](length);
        LeaderboardEntry[] memory entries = new LeaderboardEntry[](length);

        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            LeaderboardEntry storage entry = seasonLeaderboards[seasonId][user];
            if (entry.user == address(0)) {
                entries[i] = LeaderboardEntry(user, 0, 0, 0, 0);
            } else {
                entries[i] = entry;
            }
        }

        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (entries[j].points < entries[j + 1].points) {
                    LeaderboardEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }

        for (uint256 i = 0; i < length; i++) {
            topUsers[i] = entries[i].user;
        }
        return topUsers;
    }

    /**
     * @dev Retrieves the total rewards for the current season.
     * @return The total reward amount based on total games and base rewards.
     */
    function getCurrentSeasonRewards() external view returns (uint256) {
        require(
            keccak256(abi.encodePacked(seasons[currentSeasonId].state)) ==
                keccak256(abi.encodePacked("active")) ||
                keccak256(abi.encodePacked(seasons[currentSeasonId].state)) ==
                keccak256(abi.encodePacked("ended")),
            "No active or ended season"
        );
        Season storage season = seasons[currentSeasonId];
        return season.totalGames * season.baseRewards;
    }

    /**
     * @dev Retrieves detailed information about a specific season.
     * @param seasonId The ID of the season to query.
     * @return state The current state of the season.
     * @return startRoundId The starting round ID of the season.
     * @return endRoundId The ending round ID of the season, or 0 if not ended.
     * @return baseRewards The base reward amount per game.
     * @return totalGames The total number of games played.
     * @return tokenAddress The address of the token used for rewards.
     */
    function getSeason(
        uint256 seasonId
    )
        external
        view
        returns (
            string memory state,
            uint256 startRoundId,
            uint256 endRoundId,
            uint256 baseRewards,
            uint256 totalGames,
            address tokenAddress
        )
    {
        Season storage season = seasons[seasonId];
        return (
            season.state,
            season.startRoundId,
            season.endRoundId,
            season.baseRewards,
            season.totalGames,
            season.tokenAddress
        );
    }

    /**
     * @dev Retrieves the current season ID.
     * @return The current season ID.
     */
    function getCurrentSeasonId() external view returns (uint256) {
        return currentSeasonId;
    }

    /**
     * @dev Updates the label for a specific season.
     * Only the owner can call this function.
     * @param seasonId The ID of the season to update.
     * @param _label The new label for the season.
     */
    function setSeasonLabel(
        uint256 seasonId,
        string memory _label
    ) external onlyOwner {
        require(
            seasonId > 0 && seasonId <= currentSeasonId,
            "Invalid season ID"
        );
        seasonLabels[seasonId] = _label;
        emit SeasonLabelUpdated(seasonId, _label);
    }

    /**
     * @dev Retrieves the label for a specific season.
     * @param seasonId The ID of the season to query.
     * @return The label associated with the season.
     */
    function getSeasonLabel(
        uint256 seasonId
    ) external view returns (string memory) {
        return seasonLabels[seasonId];
    }

    /**
     * @dev Updates the total number of games for a season.
     * Only callable by the BattleManager contract.
     * @param seasonId The ID of the season to update.
     * @param additionalGames The number of games to add to the total.
     */
    function updateSeasonGames(
        uint256 seasonId,
        uint256 additionalGames
    ) external {
        require(
            msg.sender == address(battleManager),
            "Only BattleManager can update season games"
        );
        seasons[seasonId].totalGames += additionalGames;
    }

    /**
     * @dev Updates the leaderboard based on match results.
     * Only callable by the BattleManager contract.
     * Only can be executed while season in state of active
     * @param player1 The address of the first player in the match.
     * @param player2 The address of the second player, or address(0) if none.
     * @param winner The address of the winning player, or address(0) for a draw.
     * @param orphan The address of the orphaned player, or address(0) if none.
     */
    function updateLeaderboard(
        address player1,
        address player2,
        address winner,
        address orphan
    ) external {
        require(
            msg.sender == address(battleManager),
            "Only BattleManager can update leaderboard"
        );

        uint256 seasonId = currentSeasonId;

        require(
            keccak256(abi.encodePacked(seasons[seasonId].state)) ==
                keccak256(abi.encodePacked("active")),
            "Can only update leaderboard for active season"
        );
        if (seasonLeaderboards[seasonId][player1].user == address(0)) {
            seasonLeaderboards[seasonId][player1] = LeaderboardEntry(
                player1,
                0,
                0,
                0,
                0
            );
        }
        if (
            player2 != address(0) &&
            seasonLeaderboards[seasonId][player2].user == address(0)
        ) {
            seasonLeaderboards[seasonId][player2] = LeaderboardEntry(
                player2,
                0,
                0,
                0,
                0
            );
        }

        if (winner == player1) {
            seasonLeaderboards[seasonId][player1].wins += 1;
            seasonLeaderboards[seasonId][player1].points += 3;
            if (player2 != address(0)) {
                seasonLeaderboards[seasonId][player2].lossesOrOrphans += 1;
            }
        } else if (winner == player2) {
            seasonLeaderboards[seasonId][player2].wins += 1;
            seasonLeaderboards[seasonId][player2].points += 3;
            seasonLeaderboards[seasonId][player1].lossesOrOrphans += 1;
        } else {
            seasonLeaderboards[seasonId][player1].draws += 1;
            seasonLeaderboards[seasonId][player1].points += 1;
            if (player2 != address(0)) {
                seasonLeaderboards[seasonId][player2].draws += 1;
                seasonLeaderboards[seasonId][player2].points += 1;
            }
        }

        if (orphan != address(0)) {
            if (seasonLeaderboards[seasonId][orphan].user == address(0)) {
                seasonLeaderboards[seasonId][orphan] = LeaderboardEntry(
                    orphan,
                    0,
                    0,
                    0,
                    0
                );
            }
            seasonLeaderboards[seasonId][orphan].lossesOrOrphans += 1;
        }
    }

    /**
     * @dev Retrieves the total number of users with at least one moonster.
     * @return The total number of users.
     */
    function userListLength() external view returns (uint256) {
        uint256 totalLength = userManager.userListLength(); // Check the actual length first
        if (totalLength == 0) {
            return 0;
        }

        uint256 batchSize = 50;
        uint256 totalUsers = 0;
        uint256 offset = 0;

        while (true) {
            (address[] memory users, ) = userManager.getUsers(
                offset,
                batchSize
            );
            if (users.length == 0) {
                break;
            }
            totalUsers += users.length;
            offset += users.length;
            if (users.length < batchSize) {
                break;
            }
        }

        return totalUsers;
    }

    /**
     * @dev Saves a reward hash link for an ended season.
     * Only the owner can call this function. Protected against reentrancy.
     * @param _seasonId The ID of the season to save the hash for.
     * @param _hash The reward hash to save.
     */
    function saveSeasonRewardHashLink(
        uint256 _seasonId,
        bytes32 _hash
    ) external onlyOwner nonReentrant {
        require(
            keccak256(abi.encodePacked(seasons[_seasonId].state)) ==
                keccak256(abi.encodePacked("ended")),
            "Season must be ended"
        );
        seasonRewardHashes[_seasonId] = _hash;
        emit SeasonRewardHashSaved(_seasonId, _hash);
    }

    /**
     * @dev Retrieves the reward hash for a specific season.
     * @param _seasonId The ID of the season to query.
     * @return The reward hash associated with the season.
     */
    function getSeasonRewardHash(
        uint256 _seasonId
    ) external view returns (bytes32) {
        return seasonRewardHashes[_seasonId];
    }

    /**
     * @dev Retrieves the maximum (latest) round ID for each season. additional (07052025)
     * @return An array of MaxRoundResult structs containing the season ID and its latest round ID.
     */
    function maxRoundsResult() external view returns (MaxRoundResult[] memory) {
        MaxRoundResult[] memory results = new MaxRoundResult[](currentSeasonId);
        for (uint256 seasonId = 1; seasonId <= currentSeasonId; seasonId++) {
            uint256 maxRoundId = address(battleManager) != address(0)
                ? battleManager.getMaxRoundIdForSeason(seasonId)
                : 0;
            results[seasonId - 1] = MaxRoundResult({
                seasonId: seasonId,
                maxRoundId: maxRoundId
            });
        }
        return results;
    }
   
}
