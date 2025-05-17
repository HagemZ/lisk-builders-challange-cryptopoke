// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBattleMoonManager
 * @dev Interface for managing battle rounds and related data in the CryptoPoke system.
 */
interface IBattleMoonManager {
    /**
     * @dev Retrieves the current round ID.
     * @return The current round ID.
     */
    function getCurrentRoundId() external view returns (uint256);

    /**
     * @dev Retrieves information about participants in a round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @param includeOrphan Whether to include the orphan participant address.
     * @return participantAddresses An array of participant addresses.
     * @return participantIds An array of moonster IDs corresponding to participants.
     * @return orphan The address of the orphan participant, or address(0) if not included.
     */
    function getRoundInfo(uint256 seasonId, uint256 roundId, bool includeOrphan)
        external
        view
        returns (
            address[] memory participantAddresses,
            uint256[] memory participantIds,
            address orphan
        );

    /**
     * @dev Retrieves the state and additional data of a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @return roundState The current state of the round (e.g., "regis", "ongoing").
     * @return additionalData The additional data associated with the round.
     */
    function battleRounds(uint256 seasonId, uint256 roundId)
        external
        view
        returns (string memory roundState, bytes memory additionalData);

    /**
     * @dev Retrieves the moonster ID of a user in a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @param user The address of the user to query.
     * @return The moonster ID of the user, or 0 if not found.
     */
    function getUserMoonsterInRound(uint256 seasonId, uint256 roundId, address user)
        external
        view
        returns (uint256);

    /**
     * @dev Retrieves the state and user's moonster ID for a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @return state The current state of the round.
     * @return userMoonsterId The moonster ID of the caller, or 0 if not found.
     */
    function getBattleRoundDataFromBattleManager(uint256 seasonId, uint256 roundId)
        external
        view
        returns (string memory state, uint256 userMoonsterId);

    /**
     * @dev Retrieves the maximum (latest) round ID for a specific season. additiona ( 07052025 )
     * @param seasonId The ID of the season to query.
     * @return The maximum round ID for the season, or 0 if none exists.
     */
    function getMaxRoundIdForSeason(uint256 seasonId) external view returns (uint256);

    /**
     * @dev Resets the round counter.
     */
    function resetRoundCounter() external;
}