// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CryptoMoonCore.sol";
import "./UserMoonManager.sol";
import "./ISeasonMoonManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/**
 * @title BattleMoonManager
 * @dev Contract for managing battle rounds, matches, and rewards in the CryptoPoke system.
 * Inherits from CryptoMoonCore for token management functionality.
 */
contract BattleMoonManager is CryptoMoonCore {
    /**
     * @dev Struct representing a participant in a battle round.
     * - user: The address of the participant.
     * - id: The moonster ID of the participant.
     */
    struct BattleParticipant {
        address user;
        uint256 id;
    }

    /**
     * @dev Struct representing a match between two participants.
     * - player1: The first participant in the match.
     * - player2: The second participant in the match.
     * - winner: The address of the winning participant, or address(0) if undecided.
     */
    struct Match {
        BattleParticipant player1;
        BattleParticipant player2;
        address winner;
    }

    /**
     * @dev Struct representing a battle round.
     * - state: The current state of the round (e.g., "regis", "ongoing", "ended", "completed").
     * - participants: Array of BattleParticipant structs for all participants.
     * - matches: Array of Match structs for all matches in the round.
     * - tokenAddress: The address of the token used for fees and rewards.
     * - orphan: The address of a participant left unpaired, or address(0) if none.
     * - additionalData: Additional data for the round (currently unused).
     */
    struct BattleRound {
        string state;
        BattleParticipant[] participants;
        Match[] matches;
        address tokenAddress;
        address orphan;
        bytes additionalData;
    }

    /**
     * @dev Interface to the SeasonManager contract for season-related data.
     */
    ISeasonMoonManager public seasonManager;

    /**
     * @dev Interface to the UserMoonManager contract for user moonster data.
     */
    UserMoonManager public userManager;

    /**
     * @dev The current round ID for the active season.
     */
    uint256 public currentRoundId;

    /**
     * @dev The maximum number of players allowed per round.
     */
    uint256 public maxPlayersPerRound = 10;

    /**
     * @dev Mapping of season ID to round ID to BattleRound struct.
     */
    mapping(uint256 => mapping(uint256 => BattleRound))
        public seasonBattleRounds;

    /**
     * @dev Mapping of season ID to the maximum (latest) round ID for that season. additional ( 07052025 )
     */
    mapping(uint256 => uint256) public maxRoundIdPerSeason;

    /**
     * @dev Mapping of round ID to reward hash for verification.
     */
    mapping(uint256 => bytes32) public roundRewardHashes;

    /**
     * @dev Emitted when a new battle round is created.
     * @param roundId The ID of the newly created round.
     * @param tokenAddress The address of the token used for the round.
     */
    event RoundCreated(uint256 indexed roundId, address tokenAddress);

    /**
     * @dev Emitted when a player joins a battle round.
     * @param roundId The ID of the round the player joined.
     * @param player The address of the joining player.
     * @param moonsterId The moonster ID used by the player.
     */
    event PlayerJoined(
        uint256 indexed roundId,
        address indexed player,
        uint256 moonsterId
    );

    /**
     * @dev Emitted when the state of a battle round changes.
     * @param roundId The ID of the round whose state changed.
     * @param state The new state of the round.
     */
    event RoundStateChanged(uint256 indexed roundId, string state);

    /**
     * @dev Emitted when a match is paired in a battle round.
     * @param roundId The ID of the round where the match was paired.
     * @param player1 The address of the first player in the match.
     * @param player2 The address of the second player in the match.
     * @param id1 The moonster ID of the first player.
     * @param id2 The moonster ID of the second player.
     */
    event MatchPaired(
        uint256 indexed roundId,
        address player1,
        address player2,
        uint256 id1,
        uint256 id2
    );

    /**
     * @dev Emitted when the result of a match is updated.
     * @param roundId The ID of the round containing the match.
     * @param matchIndex The index of the match in the round's matches array.
     * @param winner The address of the winning player.
     */
    event MatchResultUpdated(
        uint256 indexed roundId,
        uint256 matchIndex,
        address winner
    );

    /**
     * @dev Emitted when a participant is declared an orphan (unpaired player).
     * @param roundId The ID of the round where the orphan was declared.
     * @param user The address of the orphaned participant.
     * @param id The moonster ID of the orphaned participant.
     */
    event OrphanDeclared(
        uint256 indexed roundId,
        address indexed user,
        uint256 id
    );

    /**
     * @dev Emitted when a reward is distributed to a user.
     * @param roundId The ID of the round where the reward was distributed.
     * @param user The address of the user receiving the reward.
     * @param amount The amount of tokens rewarded.
     */
    event RewardDistributed(
        uint256 indexed roundId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Emitted when a reward hash is saved for a round.
     * @param roundId The ID of the round for which the hash was saved.
     * @param hash The reward hash saved.
     */
    event RewardHashSaved(uint256 indexed roundId, bytes32 hash);

    /**
     * @dev Emitted when a season reward is distributed to a user.
     * @param seasonId The ID of the season where the reward was distributed.
     * @param user The address of the user receiving the reward.
     * @param amount The amount of tokens rewarded.
     */
    event SeasonRewardDistributed(
        uint256 indexed seasonId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Emitted when the round counter is reset.
     */
    event RoundCounterReset();

    /**
     * @dev Constructor to initialize the contract with an initial token and manager interfaces.
     * @param _initialToken The address of the initial accepted token.
     * @param _decimals The number of decimal places for the initial token.
     * @param _baseFee The base fee for transactions using the initial token.
     * @param _supportsPermit Whether the initial token supports EIP-2612 permit.
     * @param _symbol The symbol of the initial token (e.g., "USDT").
     * @param _image_url The URL to an image representing the initial token.
     * @param _owner The address to set as the owner of the contract.
     * @param _seasonManager The address of the SeasonManager contract.
     * @param _userManager The address of the UserMoonManager contract.
     */
    constructor(
        address _initialToken,
        uint256 _decimals,
        uint256 _baseFee,
        bool _supportsPermit,
        string memory _symbol,
        string memory _image_url,
        address _owner,
        address _seasonManager,
        address _userManager
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
        seasonManager = ISeasonMoonManager(_seasonManager);
        userManager = UserMoonManager(_userManager);
        currentRoundId = 0;
    }

    /**
     * @dev Sets the address of the SeasonManager contract.
     * Only the owner can call this function.
     * @param _seasonManager The new SeasonManager contract address.
     */
    function setSeasonManager(address _seasonManager) external onlyOwner {
        console.log(
            "BattleManager: Setting seasonManager to: %s",
            _seasonManager
        );
        require(
            _seasonManager != address(0),
            "SeasonManager address cannot be zero"
        );
        seasonManager = ISeasonMoonManager(_seasonManager);
    }

    /**
     * @dev Sets the address of the UserMoonManager contract.
     * Only the owner can call this function.
     * @param _userManager The new UserMoonManager contract address.
     */
    function setUserManager(address _userManager) external onlyOwner {
        console.log("BattleManager: Setting UserMoonManager to: %s", _userManager);
        require(
            _userManager != address(0),
            "UserMoonManager address cannot be zero"
        );
        userManager = UserMoonManager(_userManager);
    }

    /**
     * @dev Creates a new battle round for the current active season. additional (07052025 )-maxRoundIdPerSeason --save-gas-optimization to season manager
     * Only the owner can call this function.
     */
    function createRoundMatch() external onlyOwner {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        (string memory state, , , , , address tokenAddress) = seasonManager
            .getSeason(seasonId);
        require(
            keccak256(abi.encodePacked(state)) ==
                keccak256(abi.encodePacked("active")),
            "No active season to create a round"
        );
        currentRoundId++;
        BattleRound storage newRound = seasonBattleRounds[seasonId][
            currentRoundId
        ];
        newRound.state = "regis";
        newRound.tokenAddress = tokenAddress;
        newRound.orphan = address(0);
        maxRoundIdPerSeason[seasonId] = currentRoundId; // Update max round ID (07052025 )
        emit RoundCreated(currentRoundId, tokenAddress);
        emit RoundStateChanged(currentRoundId, "regis");
    }

    /**
     * @dev Allows a user to join a battle round by paying a fee.
     * Protected against reentrancy.
     * @param _id The moonster ID the user wants to use in the round.
     * @param _tokenAddress The address of the token to use for payment.
     */
    function joinBattle(
        uint256 _id,
        address _tokenAddress
    ) external nonReentrant {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        require(
            userManager.getUserIds(msg.sender).length > 0,
            "User does not own any moonster"
        );
        BattleRound storage round = seasonBattleRounds[seasonId][
            currentRoundId
        ];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("regis")),
            "Registration phase is over or round does not exist"
        );
        require(
            round.participants.length < maxPlayersPerRound,
            "Round is full"
        );

        bool isValidId = false;
        uint256[] memory userIds = userManager.getUserIds(msg.sender);
        for (uint256 i = 0; i < userIds.length; i++) {
            if (userIds[i] == _id) {
                isValidId = true;
                break;
            }
        }
        require(isValidId, "User does not own this moonster ID");

        for (uint256 i = 0; i < round.participants.length; i++) {
            require(
                round.participants[i].user != msg.sender,
                "User already joined this round"
            );
        }

        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");
        IERC20 token = IERC20(_tokenAddress);
        token.transferFrom(msg.sender, address(this), tokenInfo.baseFee);

        round.participants.push(BattleParticipant({user: msg.sender, id: _id}));
        emit PlayerJoined(currentRoundId, msg.sender, _id);
        // seasonManager.updateSeasonGames(seasonId, 1);
    }

    /**
     * @dev Updates the maximum number of players allowed per round.
     * Only the owner can call this function.
     * @param _newMaxPlayers The new maximum number of players (must be even and greater than zero).
     */
    function updatePlayerPerRound(uint256 _newMaxPlayers) external onlyOwner {
        require(_newMaxPlayers % 2 == 0, "Max players must be even");
        require(_newMaxPlayers > 0, "Max players must be greater than zero");
        maxPlayersPerRound = _newMaxPlayers;
    }

    /**
     * @dev Triggers the pairing of participants into matches for the current round.
     * Only the owner can call this function.
     */
    function triggerPairing() external onlyOwner {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        BattleRound storage round = seasonBattleRounds[seasonId][
            currentRoundId
        ];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("regis")),
            "Round must be in registration phase"
        );
        require(round.participants.length >= 2, "Not enough participants");
        require(
            round.participants.length <= maxPlayersPerRound,
            "Too many participants"
        );

        round.state = "ongoing";
        emit RoundStateChanged(currentRoundId, "ongoing");

        BattleParticipant[] memory participants = round.participants;
        uint256 n = participants.length;
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, block.prevrandao, i)
                )
            ) % (i + 1);
            BattleParticipant memory temp = participants[i];
            participants[i] = participants[j];
            participants[j] = temp;
        }

        for (uint256 i = 0; i < n - 1; i += 2) {
            round.matches.push(
                Match({
                    player1: participants[i],
                    player2: participants[i + 1],
                    winner: address(0)
                })
            );
            emit MatchPaired(
                currentRoundId,
                participants[i].user,
                participants[i + 1].user,
                participants[i].id,
                participants[i + 1].id
            );
        }

        if (n % 2 == 1) {
            round.orphan = participants[n - 1].user;
            emit OrphanDeclared(
                currentRoundId,
                participants[n - 1].user,
                participants[n - 1].id
            );
        } else {
            round.orphan = address(0);
        }
    }

    /**
     * @dev Retrieves the details of all matches in a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param _roundId The ID of the round to query.
     * @return players1 An array of addresses for the first player in each match.
     * @return ids1 An array of moonster IDs for the first player in each match.
     * @return players2 An array of addresses for the second player in each match.
     * @return ids2 An array of moonster IDs for the second player in each match.
     * @return winners An array of addresses for the winners of each match.
     */
    function getPairMatch(
        uint256 seasonId,
        uint256 _roundId
    )
        external
        view
        returns (
            address[] memory players1,
            uint256[] memory ids1,
            address[] memory players2,
            uint256[] memory ids2,
            address[] memory winners
        )
    {
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        uint256 matchCount = round.matches.length;
        players1 = new address[](matchCount);
        ids1 = new uint256[](matchCount);
        players2 = new address[](matchCount);
        ids2 = new uint256[](matchCount);
        winners = new address[](matchCount);

        for (uint256 i = 0; i < matchCount; i++) {
            players1[i] = round.matches[i].player1.user;
            ids1[i] = round.matches[i].player1.id;
            players2[i] = round.matches[i].player2.user;
            ids2[i] = round.matches[i].player2.id;
            winners[i] = round.matches[i].winner;
        }

        return (players1, ids1, players2, ids2, winners);
    }

    /**
     * @dev Updates the results of matches in a round and declares an orphan if applicable.
     * Only the owner can call this function.
     * @param _roundId The ID of the round to update.
     * @param _matchIndices An array of match indices to update.
     * @param _winners An array of winner addresses corresponding to the match indices.
     * @param _orphan The address of the orphan participant, or address(0) if none.
     */
    function updateResultPairMatch(
        uint256 _roundId,
        uint256[] memory _matchIndices,
        address[] memory _winners,
        address _orphan
    ) external onlyOwner {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("ongoing")),
            "Round must be in ongoing phase"
        );
        (string memory seasonState, , , , , ) = seasonManager.getSeason(seasonId);
        require(
            keccak256(abi.encodePacked(seasonState)) ==
                keccak256(abi.encodePacked("active")),
            "Cannot update leaderboard for ended season"
        );
        require(
            _matchIndices.length == _winners.length,
            "Match indices and winners length mismatch"
        );
        require(_matchIndices.length > 0, "No match results provided");

        for (uint256 i = 0; i < _matchIndices.length; i++) {
            uint256 matchIndex = _matchIndices[i];
            require(matchIndex < round.matches.length, "Invalid match index");
            address winner = _winners[i];
            require(
                winner == round.matches[matchIndex].player1.user ||
                    winner == round.matches[matchIndex].player2.user,
                "Invalid winner address"
            );
            round.matches[matchIndex].winner = winner;
            emit MatchResultUpdated(_roundId, matchIndex, winner);

            // Update leaderboard for this match
            seasonManager.updateLeaderboard(
                round.matches[matchIndex].player1.user,
                round.matches[matchIndex].player2.user,
                winner,
                address(0)
            );
        }

        if (_orphan != address(0)) {
            bool isParticipant = false;
            for (uint256 i = 0; i < round.participants.length; i++) {
                if (round.participants[i].user == _orphan) {
                    isParticipant = true;
                    emit OrphanDeclared(
                        _roundId,
                        _orphan,
                        round.participants[i].id
                    );
                    break;
                }
            }
            require(isParticipant, "Orphan must be a participant");
            round.orphan = _orphan;
        }

        if (round.orphan != address(0)) {
            seasonManager.updateLeaderboard(
                round.orphan,
                address(0),
                address(0),
                round.orphan
            );
        }

        seasonManager.updateSeasonGames(seasonId, round.matches.length);
        round.state = "ended";
        emit RoundStateChanged(_roundId, "ended");
    }

    /**
     * @dev Distributes rewards to winners and orphans after a round ends.
     * Only the owner can call this function. Protected against reentrancy.
     * @param _roundId The ID of the round to distribute rewards for.
     */
    function sendRewardMatch(uint256 _roundId) external onlyOwner nonReentrant {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("ended")),
            "Round must be in ended phase"
        );
        (string memory seasonState, , , , , ) = seasonManager.getSeason(
            seasonId
        );
        require(
            keccak256(abi.encodePacked(seasonState)) ==
                keccak256(abi.encodePacked("active")),
            "No active season"
        );

        round.state = "completed";
        emit RoundStateChanged(_roundId, "completed");

        TokenInfo memory tokenInfo = tokenDetails[round.tokenAddress];
        IERC20 token = IERC20(round.tokenAddress);
        uint256 rewardAmount = tokenInfo.baseFee + (tokenInfo.baseFee / 2);
        uint256 feeReturn = tokenInfo.baseFee;

        for (uint256 i = 0; i < round.matches.length; i++) {
            if (round.matches[i].winner != address(0)) {
                token.transfer(round.matches[i].winner, rewardAmount);
                emit RewardDistributed(
                    _roundId,
                    round.matches[i].winner,
                    rewardAmount
                );
            }
        }

        if (round.participants.length % 2 == 1 && round.orphan != address(0)) {
            bool isOrphanWinner = false;
            for (uint256 i = 0; i < round.matches.length; i++) {
                if (round.matches[i].winner == round.orphan) {
                    isOrphanWinner = true;
                    break;
                }
            }
            if (!isOrphanWinner) {
                token.transfer(round.orphan, feeReturn);
                emit RewardDistributed(_roundId, round.orphan, feeReturn);
            }
        }
    }

    /**
     * @dev Saves a reward hash link for a completed round.
     * Only the owner can call this function. Protected against reentrancy.
     * @param _roundId The ID of the round to save the hash for.
     * @param _hash The reward hash to save.
     */
    function saveRewardHashLink(
        uint256 _roundId,
        bytes32 _hash
    ) external onlyOwner nonReentrant {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("completed")),
            "Round must be in completed phase"
        );
        roundRewardHashes[_roundId] = _hash;
        emit RewardHashSaved(_roundId, _hash);
    }

    /**
     * @dev Retrieves the reward hash for a specific round.
     * @param _roundId The ID of the round to query.
     * @return The reward hash associated with the round.
     */
    function getRewardHash(uint256 _roundId) external view returns (bytes32) {
        return roundRewardHashes[_roundId];
    }

    /**
     * @dev Retrieves a recap of all matches in a completed round.
     * @param seasonId The ID of the season containing the round.
     * @param _roundId The ID of the round to query.
     * @return players1 An array of addresses for the first player in each match.
     * @return ids1 An array of moonster IDs for the first player in each match.
     * @return players2 An array of addresses for the second player in each match.
     * @return ids2 An array of moonster IDs for the second player in each match.
     * @return winners An array of addresses for the winners of each match.
     */
    function getRoundRecap(
        uint256 seasonId,
        uint256 _roundId
    )
        external
        view
        returns (
            address[] memory players1,
            uint256[] memory ids1,
            address[] memory players2,
            uint256[] memory ids2,
            address[] memory winners
        )
    {
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        require(
            keccak256(abi.encodePacked(round.state)) ==
                keccak256(abi.encodePacked("completed")),
            "Round is not completed"
        );

        uint256 matchCount = round.matches.length;
        players1 = new address[](matchCount);
        ids1 = new uint256[](matchCount);
        players2 = new address[](matchCount);
        ids2 = new uint256[](matchCount);
        winners = new address[](matchCount);

        for (uint256 i = 0; i < matchCount; i++) {
            players1[i] = round.matches[i].player1.user;
            ids1[i] = round.matches[i].player1.id;
            players2[i] = round.matches[i].player2.user;
            ids2[i] = round.matches[i].player2.id;
            winners[i] = round.matches[i].winner;
        }

        return (players1, ids1, players2, ids2, winners);
    }

    /**
     * @dev Retrieves information about participants in a round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @param includeOrphan Whether to include the orphan participant address.
     * @return participantAddresses An array of participant addresses.
     * @return participantIds An array of moonster IDs corresponding to participants.
     * @return orphan The address of the orphan participant, or address(0) if not included.
     */
    function getRoundInfo(
        uint256 seasonId,
        uint256 roundId,
        bool includeOrphan
    )
        external
        view
        returns (
            address[] memory participantAddresses,
            uint256[] memory participantIds,
            address orphan
        )
    {
        require(roundId > 0, "Invalid round ID");
        BattleRound storage round = seasonBattleRounds[seasonId][roundId];
        participantAddresses = new address[](round.participants.length);
        participantIds = new uint256[](round.participants.length);
        for (uint256 i = 0; i < round.participants.length; i++) {
            participantAddresses[i] = round.participants[i].user;
            participantIds[i] = round.participants[i].id;
        }
        orphan = includeOrphan ? round.orphan : address(0);
    }

    /**
     * @dev Checks if a user is participating in a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param _roundId The ID of the round to query.
     * @param _user The address of the user to check.
     * @return True if the user is in the round, false otherwise.
     */
    function isUserInRound(
        uint256 seasonId,
        uint256 _roundId,
        address _user
    ) external view returns (bool) {
        BattleRound storage round = seasonBattleRounds[seasonId][_roundId];
        for (uint256 i = 0; i < round.participants.length; i++) {
            if (round.participants[i].user == _user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Retrieves the moonster ID of a user in a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @param _user The address of the user to query.
     * @return The moonster ID of the user, or 0 if not found.
     */
    function getUserMoonsterInRound(
        uint256 seasonId,
        uint256 roundId,
        address _user
    ) external view returns (uint256) {
        BattleRound storage round = seasonBattleRounds[seasonId][roundId];
        for (uint256 i = 0; i < round.participants.length; i++) {
            if (round.participants[i].user == _user) {
                return round.participants[i].id;
            }
        }
        return 0;
    }

    /**
     * @dev Retrieves the state and additional data of a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @return roundState The current state of the round.
     * @return additionalData The additional data associated with the round.
     */
    function battleRounds(
        uint256 seasonId,
        uint256 roundId
    )
        external
        view
        returns (string memory roundState, bytes memory additionalData)
    {
        BattleRound storage round = seasonBattleRounds[seasonId][roundId];
        roundState = round.state;
        additionalData = round.additionalData;
    }

    /**
     * @dev Retrieves the state and user's moonster ID for a specific round.
     * @param seasonId The ID of the season containing the round.
     * @param roundId The ID of the round to query.
     * @return state The current state of the round.
     * @return userMoonsterId The moonster ID of the caller, or 0 if not found.
     */
    function getBattleRoundDataFromBattleManager(
        uint256 seasonId,
        uint256 roundId
    ) external view returns (string memory state, uint256 userMoonsterId) {
        BattleRound storage round = seasonBattleRounds[seasonId][roundId];
        userMoonsterId = 0;
        for (uint256 i = 0; i < round.participants.length; i++) {
            if (round.participants[i].user == msg.sender) {
                userMoonsterId = round.participants[i].id;
                break;
            }
        }
        state = round.state;
    }

    /**
     * @dev Retrieves the current round ID.
     * @return The current round ID.
     */
    function getCurrentRoundId() external view returns (uint256) {
        return currentRoundId;
    }

    /**
     * @dev Retrieves the maximum (latest) round ID for a specific season. additional (07052025)
     * @param seasonId The ID of the season to query.
     * @return The maximum round ID for the season, or 0 if none exists.
     */
    function getMaxRoundIdForSeason(uint256 seasonId) external view returns (uint256) {
        return maxRoundIdPerSeason[seasonId];
    }

    /**
     * @dev Resets the round counter. modified (07052025)
     * Only callable by the SeasonManager contract.
     */
    function resetRoundCounter() external {
        require(
            msg.sender == address(seasonManager),
            "Only SeasonManager can reset round counter"
        );
        // currentRoundId = 0;
        // emit RoundCounterReset();
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        currentRoundId = 0;
        maxRoundIdPerSeason[seasonId] = 0; // Reset max round ID for the new season
        emit RoundCounterReset();
    }

    /**
     * @dev Distributes season rewards to the top players.
     * Only the owner can call this function. Protected against reentrancy.
     */
    function distributeSeasonRewards() external onlyOwner nonReentrant {
        uint256 seasonId = seasonManager.getCurrentSeasonId();
        (
            string memory state,
            ,
            ,
            uint256 baseRewards,
            uint256 totalGames,
            address tokenAddress
        ) = seasonManager.getSeason(seasonId);
        require(
            keccak256(abi.encodePacked(state)) ==
                keccak256(abi.encodePacked("ended")),
            "Season must be ended"
        );

        uint256 totalReward = totalGames * baseRewards;
        address[] memory topPlayers = seasonManager.getTopPlayers(
            seasonId,
            3,
            0
        );
        require(topPlayers.length > 0, "No top players available");

        IERC20 token = IERC20(tokenAddress);
        uint256 rewardForFirst = (totalReward * 35) / 100;
        uint256 rewardForSecond = (totalReward * 25) / 100;
        uint256 rewardForThird = (totalReward * 20) / 100;
        uint256 totalDistributed = 0;

        bool atLeastOneTransfer = false;
        if (topPlayers.length >= 1 && topPlayers[0] != address(0)) {
            token.transfer(topPlayers[0], rewardForFirst);
            emit SeasonRewardDistributed(
                seasonId,
                topPlayers[0],
                rewardForFirst
            );
            totalDistributed += rewardForFirst;
            atLeastOneTransfer = true;
        }
        if (topPlayers.length >= 2 && topPlayers[1] != address(0)) {
            token.transfer(topPlayers[1], rewardForSecond);
            emit SeasonRewardDistributed(
                seasonId,
                topPlayers[1],
                rewardForSecond
            );
            totalDistributed += rewardForSecond;
            atLeastOneTransfer = true;
        }
        if (topPlayers.length >= 3 && topPlayers[2] != address(0)) {
            token.transfer(topPlayers[2], rewardForThird);
            emit SeasonRewardDistributed(
                seasonId,
                topPlayers[2],
                rewardForThird
            );
            totalDistributed += rewardForThird;
            atLeastOneTransfer = true;
        }
        require(
            atLeastOneTransfer,
            "No valid players to distribute rewards to"
        );

        uint256 ownerReward = totalReward - totalDistributed;
        if (ownerReward > 0) {
            token.transfer(owner(), ownerReward);
            emit SeasonRewardDistributed(seasonId, owner(), ownerReward);
        }
    }

    /**
     * @dev Struct representing the result of a round, including participants and outcome.
     * - roundId: The ID of the round.
     * - state: The current state of the round.
     * - participants: Array of participant addresses.
     * - moonsterIds: Array of moonster IDs corresponding to participants.
     * - winner: The round-level winner (address(0) if not applicable).
     * - orphan: The address of the unpaired participant, or address(0) if none.
     */
    struct MatchResult {
        uint256 roundId;
        string state;
        address[] participants;
        uint256[] moonsterIds;
        address winner;
        address orphan;
    }

    /**
     * @dev Retrieves match results for a range of rounds in a season.
     * @param seasonId The ID of the season to query.
     * @param startRoundId The starting round ID (inclusive).
     * @param endRoundId The ending round ID (inclusive).
     * @return An array of MatchResult structs for the specified range.
     */
    function getMatchesForSeason(
        uint256 seasonId,
        uint256 startRoundId,
        uint256 endRoundId
    ) external view returns (MatchResult[] memory) {
        require(
            startRoundId > 0 && startRoundId <= endRoundId,
            "Invalid round range"
        );
        uint256 matchCount = endRoundId - startRoundId + 1;
        MatchResult[] memory matches = new MatchResult[](matchCount);

        for (uint256 i = 0; i < matchCount; i++) {
            uint256 roundId = startRoundId + i;
            BattleRound storage round = seasonBattleRounds[seasonId][roundId];
            address[] memory participants = new address[](
                round.participants.length
            );
            uint256[] memory moonsterIds = new uint256[](
                round.participants.length
            );

            for (uint256 j = 0; j < participants.length; j++) {
                participants[j] = round.participants[j].user;
                moonsterIds[j] = round.participants[j].id;
            }

            matches[i] = MatchResult({
                roundId: roundId,
                state: round.state,
                participants: participants,
                moonsterIds: moonsterIds,
                winner: address(0), // No round-level winner; can be derived from matches if needed
                orphan: round.orphan
            });
        }

        return matches;
    }
}
