// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISeasonMoonManager
 * @dev Interface for managing seasons, leaderboards, and related data in the CryptoPoke system.
 */
interface ISeasonMoonManager {
    /**
     * @dev Retrieves detailed information about a specific season.
     * @param seasonId The ID of the season to query.
     * @return state The current state of the season (e.g., "active", "ended").
     * @return startRoundId The starting round ID of the season.
     * @return endRoundId The ending round ID of the season, or 0 if not ended.
     * @return baseRewards The base reward amount per game.
     * @return totalGames The total number of games played in the season.
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
        );

    /**
     * @dev Retrieves the current season ID.
     * @return The current season ID.
     */
    function getCurrentSeasonId() external view returns (uint256);

    /**
     * @dev Updates the total number of games for a season.
     * @param seasonId The ID of the season to update.
     * @param additionalGames The number of games to add to the total.
     */
    function updateSeasonGames(
        uint256 seasonId,
        uint256 additionalGames
    ) external;

    /**
     * @dev Updates the leaderboard based on match results.
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
    ) external;

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
    ) external view returns (address[] memory);

    /**
     * @dev Retrieves the total number of users with at least one moonster.
     * @return The total number of users.
     */
    function userListLength() external view returns (uint256);
}