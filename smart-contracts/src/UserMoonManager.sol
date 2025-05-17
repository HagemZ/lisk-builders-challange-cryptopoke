// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CryptoMoonCore.sol";
import "./IBattleMoonManager.sol";
import "./ISeasonMoonManager.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "hardhat/console.sol";

/**
 * @title UserMoonManager
 * @dev Contract for managing user moonster IDs, bookmarks, and interactions with BattleManager and SeasonManager.
 * Inherits from CryptoMoonCore for token management functionality.
 */
contract UserMoonManager is CryptoMoonCore {
    /**
     * @dev Mapping of user addresses to their assigned moonster IDs.
     */
    mapping(address => uint256[]) public userIds;

    /**
     * @dev List of user addresses that have at least one moonster.
     */
    address[] private userList;

    /**
     * @dev Mapping of user addresses to their bookmarked moonster IDs.
     */
    mapping(address => uint256[]) public userBookmarks;

    /**
     * @dev Interface to the BattleManager contract for round and match data.
     */
    IBattleMoonManager public battleManager;

    /**
     * @dev Interface to the SeasonManager contract for season-related data.
     */
    ISeasonMoonManager public seasonManager;

    /**
     * @dev Emitted when a moonster ID is assigned to a user.
     * @param user The address of the user receiving the ID.
     * @param id The moonster ID assigned.
     */
    event IDAssigned(address indexed user, uint256 indexed id);

    /**
     * @dev Emitted for debugging purposes to log random value and chance during capture attempts.
     * @param randomValue The generated random value (0-99).
     * @param _chance The success chance provided (1-100).
     */
    event DebugRandomValue(uint256 randomValue, uint256 _chance);

    /**
     * @dev Emitted when a moonster capture attempt fails.
     * @param user The address of the user attempting the capture.
     * @param id The moonster ID attempted to capture.
     * @param chance The success chance provided (1-100).
     * @param userChance The random value generated for the user (0-99).
     */
    event CaptureFailed(
        address indexed user,
        uint256 id,
        uint256 chance,
        uint256 userChance
    );

    /**
     * @dev Emitted when a moonster evolves into a new ID.
     * @param user The address of the user whose moonster evolved.
     * @param oldId The previous moonster ID.
     * @param newId The new moonster ID after evolution.
     */
    event PokemonEvolved(
        address indexed user,
        uint256 indexed oldId,
        uint256 indexed newId
    );

    /**
     * @dev Emitted when a moonster evolution is blocked due to an active battle round.
     * @param user The address of the user attempting evolution.
     * @param pokemonId The moonster ID being evolved.
     * @param roundId The round ID where the moonster is active.
     */
    event EvolutionBlocked(
        address indexed user,
        uint256 indexed pokemonId,
        uint256 indexed roundId
    );

    /**
     * @dev Constructor to initialize the contract with an initial token and manager interfaces.
     * @param _initialToken The address of the initial accepted token.
     * @param _decimals The number of decimal places for the initial token.
     * @param _baseFee The base fee for transactions using the initial token.
     * @param _supportsPermit Whether the initial token supports EIP-2612 permit.
     * @param _symbol The symbol of the initial token (e.g., "USDT").
     * @param _image_url The URL to an image representing the initial token.
     * @param _owner The address to set as the owner of the contract.
     * @param _battleManager The address of the BattleManager contract.
     * @param _seasonManager The address of the SeasonManager contract.
     */
    constructor(
        address _initialToken,
        uint256 _decimals,
        uint256 _baseFee,
        bool _supportsPermit,
        string memory _symbol,
        string memory _image_url,
        address _owner,
        address _battleManager,
        address _seasonManager
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
        // Allow zero addresses, validate in setters
        battleManager = IBattleMoonManager(_battleManager);
        seasonManager = ISeasonMoonManager(_seasonManager);
    }

    /**
     * @dev Sets the address of the BattleManager contract.
     * Only the owner can call this function.
     * @param _battleManager The new BattleManager contract address.
     */
    function setBattleManager(address _battleManager) external onlyOwner {
        console.log("UserMoonManager: Setting battleManager to: %s", _battleManager);
        require(
            _battleManager != address(0),
            "BattleManager address cannot be zero"
        );
        battleManager = IBattleMoonManager(_battleManager);
    }

    /**
     * @dev Sets the address of the SeasonManager contract.
     * Only the owner can call this function.
     * @param _seasonManager The new SeasonManager contract address.
     */
    function setSeasonManager(address _seasonManager) external onlyOwner {
        console.log("UserMoonManager: Setting seasonManager to: %s", _seasonManager);
        require(
            _seasonManager != address(0),
            "SeasonManager address cannot be zero"
        );
        seasonManager = ISeasonMoonManager(_seasonManager);
    }

    /**
     * @dev Retrieves the current round ID from the BattleManager contract.
     * @return The current round ID.
     */
    function getCurrentRoundIdFromBattleManager() external view returns (uint256) {
        return battleManager.getCurrentRoundId();
    }

    /**
     * @dev Allows a user to pay and attempt to capture a moonster with a given chance.
     * Uses a signature for authorization. Protected against reentrancy.
     * @param _tokenAddress The address of the token to use for payment.
     * @param _id The moonster ID to attempt capturing.
     * @param _chance The success chance (1-100).
     * @param _timestamp The timestamp for signature validation.
     * @param signature The signature to verify ownership and authorization.
     */
    function payAndAssignId(
        address _tokenAddress,
        uint256 _id,
        uint256 _chance,
        uint256 _timestamp,
        bytes memory signature
    ) external nonReentrant {
        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");
        require(
            _chance > 0 && _chance <= 100,
            "Chance must be between 1 and 100"
        );
        require(userIds[msg.sender].length < 5, "User already has 5 Pokemons");

        for (uint256 i = 0; i < userIds[msg.sender].length; i++) {
            require(userIds[msg.sender][i] != _id, "moonster ID already owned");
        }

        bytes32 hash = keccak256(
            abi.encodePacked(
                msg.sender,
                _tokenAddress,
                _chance,
                _id,
                _timestamp
            )
        );
        require(!usedSignatures[hash], "Signature already used");

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ECDSA.recover(ethSignedHash, signature);
        require(signer == owner(), "Invalid signature");

        usedSignatures[hash] = true;

        IERC20 token = IERC20(_tokenAddress);
        token.transferFrom(msg.sender, address(this), tokenInfo.baseFee);

        uint256 userChance = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)
            )
        ) % 100;

        bool captureSuccess = userChance < _chance;
        emit DebugRandomValue(userChance, _chance);

        if (captureSuccess) {
            userIds[msg.sender].push(_id);
            if (userIds[msg.sender].length == 1) {
                userList.push(msg.sender);
            }
            emit IDAssigned(msg.sender, _id);
        } else {
            emit CaptureFailed(msg.sender, _id, _chance, userChance);
        }
    }

    /**
     * @dev Allows a user to pay and attempt to capture a moonster with a given chance using EIP-2612 permit.
     * Protected against reentrancy.
     * @param _tokenAddress The address of the token to use for payment.
     * @param _id The moonster ID to attempt capturing.
     * @param _chance The success chance (1-100).
     * @param _timestamp The timestamp for signature validation.
     * @param signature The signature to verify ownership and authorization.
     * @param deadline The deadline for the permit signature.
     * @param v The recovery identifier for the permit signature.
     * @param r The r component of the permit signature.
     * @param s The s component of the permit signature.
     */
    function payAndAssignIdWithPermit(
        address _tokenAddress,
        uint256 _id,
        uint256 _chance,
        uint256 _timestamp,
        bytes memory signature,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");
        require(tokenInfo.supportsPermit, "Token does not support permit");
        require(
            _chance > 0 && _chance <= 100,
            "Chance must be between 1 and 100"
        );
        require(userIds[msg.sender].length < 5, "User already has 5 Pokemons");

        for (uint256 i = 0; i < userIds[msg.sender].length; i++) {
            require(userIds[msg.sender][i] != _id, "moonster ID already owned");
        }

        bytes32 hash = keccak256(
            abi.encodePacked(
                msg.sender,
                _tokenAddress,
                _chance,
                _id,
                _timestamp
            )
        );
        require(!usedSignatures[hash], "Signature already used");

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ECDSA.recover(ethSignedHash, signature);
        require(signer == owner(), "Invalid signature");

        usedSignatures[hash] = true;

        IERC20Permit(_tokenAddress).permit(
            msg.sender,
            address(this),
            tokenInfo.baseFee,
            deadline,
            v,
            r,
            s
        );
        IERC20(_tokenAddress).transferFrom(
            msg.sender,
            address(this),
            tokenInfo.baseFee
        );

        uint256 userChance = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)
            )
        ) % 100;

        bool captureSuccess = userChance < _chance;
        emit DebugRandomValue(userChance, _chance);

        if (captureSuccess) {
            userIds[msg.sender].push(_id);
            if (userIds[msg.sender].length == 1) {
                userList.push(msg.sender);
            }
            emit IDAssigned(msg.sender, _id);
        } else {
            emit CaptureFailed(msg.sender, _id, _chance, userChance);
        }
    }

    /**
     * @dev Allows a user to pay and evolve a moonster to a new ID.
     * Checks if the moonster is in an active battle round before evolution.
     * Protected against reentrancy.
     * @param _tokenAddress The address of the token to use for payment.
     * @param _currentId The current moonster ID to evolve.
     * @param _newId The new moonster ID after evolution.
     * @param _timestamp The timestamp for signature validation.
     * @param signature The signature to verify ownership and authorization.
     */
    function payAndEvolve(
        address _tokenAddress,
        uint256 _currentId,
        uint256 _newId,
        uint256 _timestamp,
        bytes memory signature
    ) external nonReentrant {
        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");

        // Get the current season ID and round ID
        uint256 currentSeasonId = seasonManager.getCurrentSeasonId();
        uint256 currentRoundId = battleManager.getCurrentRoundId();

        // Check if the user is participating in the current round with the moonster
        if (currentRoundId > 0) {
            (string memory roundState, uint256 userMoonsterId) = battleManager.getBattleRoundDataFromBattleManager(currentSeasonId, currentRoundId);
            if (
                keccak256(abi.encodePacked(roundState)) ==
                keccak256(abi.encodePacked("ongoing"))
            ) {
                if (userMoonsterId == _currentId && userMoonsterId != 0) {
                    emit EvolutionBlocked(msg.sender, _currentId, currentRoundId);
                    revert("Cannot evolve moonster in an active battle round");
                }
            }
        }

        // Ownership check
        uint256[] storage ids = userIds[msg.sender];
        uint256 idIndex = type(uint256).max;
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == _currentId) {
                idIndex = i;
                break;
            }
        }
        require(idIndex != type(uint256).max, "User does not own this moonster");

        // Signature validation
        bytes32 hash = keccak256(
            abi.encodePacked(
                msg.sender,
                _tokenAddress,
                _currentId,
                _newId,
                _timestamp
            )
        );
        require(!usedSignatures[hash], "Signature already used");

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ECDSA.recover(ethSignedHash, signature);
        require(signer == owner(), "Invalid signature");

        usedSignatures[hash] = true;

        // Fee payment
        uint256 evolutionFee = tokenInfo.baseFee * 3;
        IERC20 token = IERC20(_tokenAddress);
        token.transferFrom(msg.sender, address(this), evolutionFee);

        // Update moonster ID
        ids[idIndex] = _newId;

        // Update bookmarks if applicable
        uint256[] storage bookmarks = userBookmarks[msg.sender];
        for (uint256 i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i] == _currentId) {
                bookmarks[i] = _newId;
                break;
            }
        }

        emit PokemonEvolved(msg.sender, _currentId, _newId);
    }

    /**
     * @dev Allows a user to bookmark a moonster by paying a fee.
     * Protected against reentrancy.
     * @param _id The moonster ID to bookmark.
     * @param _tokenAddress The address of the token to use for payment.
     */
    function bookmarkPokemon(uint256 _id, address _tokenAddress)
        external
        nonReentrant
    {
        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");
        uint256[] memory bookmarks = userBookmarks[msg.sender];
        for (uint256 i = 0; i < bookmarks.length; i++) {
            require(bookmarks[i] != _id, "moonster already bookmarked");
        }
        require(bookmarks.length < 12, "Bookmark limit reached");
        uint256 bookmarkFee = tokenInfo.baseFee / 10;
        IERC20 token = IERC20(_tokenAddress);
        token.transferFrom(msg.sender, address(this), bookmarkFee);
        userBookmarks[msg.sender].push(_id);
    }

    /**
     * @dev Allows a user to bookmark a moonster using EIP-2612 permit.
     * Protected against reentrancy.
     * @param _id The moonster ID to bookmark.
     * @param _tokenAddress The address of the token to use for payment.
     * @param deadline The deadline for the permit signature.
     * @param v The recovery identifier for the permit signature.
     * @param r The r component of the permit signature.
     * @param s The s component of the permit signature.
     */
    function bookmarkPokemonWithPermit(
        uint256 _id,
        address _tokenAddress,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        TokenInfo memory tokenInfo = tokenDetails[_tokenAddress];
        require(tokenInfo.isAccepted, "Token is not accepted");
        require(tokenInfo.supportsPermit, "Token does not support permit");
        uint256[] memory bookmarks = userBookmarks[msg.sender];
        for (uint256 i = 0; i < bookmarks.length; i++) {
            require(bookmarks[i] != _id, "moonster already bookmarked");
        }
        require(bookmarks.length < 12, "Bookmark limit reached");
        uint256 bookmarkFee = tokenInfo.baseFee / 10;
        IERC20Permit(_tokenAddress).permit(
            msg.sender,
            address(this),
            bookmarkFee,
            deadline,
            v,
            r,
            s
        );
        IERC20(_tokenAddress).transferFrom(
            msg.sender,
            address(this),
            bookmarkFee
        );
        userBookmarks[msg.sender].push(_id);
    }

    /**
     * @dev Allows a user to remove a bookmarked moonster.
     * @param _id The moonster ID to remove from bookmarks.
     */
    function removeBookmark(uint256 _id) external {
        uint256[] storage bookmarks = userBookmarks[msg.sender];
        uint256 bookmarkIndex = type(uint256).max;
        for (uint256 i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i] == _id) {
                bookmarkIndex = i;
                break;
            }
        }
        require(bookmarkIndex != type(uint256).max, "moonster not bookmarked");
        if (bookmarkIndex < bookmarks.length - 1) {
            bookmarks[bookmarkIndex] = bookmarks[bookmarks.length - 1];
        }
        bookmarks.pop();
    }

    /**
     * @dev Retrieves the list of bookmarked moonster IDs for a user.
     * @param user The address of the user to query.
     * @return An array of bookmarked moonster IDs.
     */
    function getUserBookmarks(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userBookmarks[user];
    }

    /**
     * @dev Retrieves the list of moonster IDs owned by a user.
     * @param user The address of the user to query.
     * @return An array of moonster IDs.
     */
    function getUserIds(address user) external view returns (uint256[] memory) {
        return userIds[user];
    }

    /**
     * @dev Retrieves a paginated list of users and their moonster IDs.
     * @param offset The starting index of the user list.
     * @param limit The maximum number of users to return.
     * @return users An array of user addresses.
     * @return ids A 2D array of moonster IDs corresponding to each user.
     */
    function getUsers(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory, uint256[][] memory)
    {
        require(offset < userList.length, "Offset out of bounds");
        uint256 end = offset + limit;
        if (end > userList.length) {
            end = userList.length;
        }
        uint256 length = end - offset;
        address[] memory users = new address[](length);
        uint256[][] memory ids = new uint256[][](length);
        for (uint256 i = 0; i < length; i++) {
            users[i] = userList[offset + i];
            ids[i] = userIds[users[i]];
        }
        return (users, ids);
    }

    /**
     * @dev Retrieves the total number of users with at least one moonster.
     * @return The length of the user list.
     */
    function userListLength() external view returns (uint256) {
        return userList.length;
    }

    /**
     * @dev Public wrapper for getTokenBalances to retrieve token balances and decimals.
     * @return tokenAddresses An array of token addresses.
     * @return balances An array of balances for each token in the contract.
     * @return decimals An array of decimal places for each token.
     */
    function getPublicTokenBalances()
        public
        view
        returns (
            address[] memory tokenAddresses,
            uint256[] memory balances,
            uint256[] memory decimals
        )
    {
        return getTokenBalances();
    }

    /**
     * @dev Allows the owner to import user data, assigning moonster IDs to users.
     * @param userAddresses An array of user addresses to import.
     * @param userIdsList An array of moonster IDs to assign to the users.
     */
    function importUserData(
        address[] memory userAddresses,
        uint256[] memory userIdsList
    ) external onlyOwner {
        require(
            userAddresses.length == userIdsList.length,
            "Mismatched input lengths"
        );
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address user = userAddresses[i];
            uint256 id = userIdsList[i];
            require(user != address(0), "Invalid user address");

            for (uint256 j = 0; j < userIds[user].length; j++) {
                require(userIds[user][j] != id, "moonster ID already owned");
            }

            if (userIds[user].length == 0) {
                userList.push(user);
            }
            userIds[user].push(id);
        }
    }

    /**
     * @dev Allows the owner to export user and token data.
     * @return userAddresses An array of user addresses.
     * @return userIdsList An array of the first moonster ID for each user (or 0 if none).
     * @return tokenAddresses An array of token addresses.
     * @return balances An array of balances for each token in the contract.
     * @return decimals An array of decimal places for each token.
     */
    function exportData()
        external
        view
        onlyOwner
        returns (
            address[] memory userAddresses,
            uint256[] memory userIdsList,
            address[] memory tokenAddresses,
            uint256[] memory balances,
            uint256[] memory decimals
        )
    {
        uint256 userCount = userList.length;
        userAddresses = new address[](userCount);
        userIdsList = new uint256[](userCount);
        for (uint256 i = 0; i < userCount; i++) {
            userAddresses[i] = userList[i];
            uint256[] memory userIdArray = userIds[userAddresses[i]];
            userIdsList[i] = userIdArray.length > 0 ? userIdArray[0] : 0;
        }
        (tokenAddresses, balances, decimals) = getTokenBalances();
        return (userAddresses, userIdsList, tokenAddresses, balances, decimals);
    }
}