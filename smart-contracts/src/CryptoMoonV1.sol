// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CryptoMoonV1
 * @dev Contract for managing Moonster, including creation, evolution tracking, and battle comparisons.
 * Inherits from AccessControl for role-based access control, enabling restricted operations to designated designers and admins.
 */
contract CryptoMoonV1 is AccessControl {
    /// @dev Role identifier for the designer role, allowing certain operations like adding Moonsters and counters.
    bytes32 public constant DESIGNER_ROLE = keccak256("DESIGNER_ROLE");

    /**
     * @dev Struct to represent a Moonster's stat with a name and value.
     */
    struct Stat {
        string name;    // Name of the stat (e.g., "Attack", "Defense").
        uint256 value;  // Value of the stat.
    }

    /**
     * @dev Struct to represent an evolution stage of a Moonster.
     */
    struct Evolution {
        string name;    // Name of the Moonster in this evolution stage.
        string image;   // Image URI for this evolution stage.
        uint256 id;     // Unique identifier for this evolution stage.
    }

    /**
     * @dev Struct to represent a Moonster with all its attributes.
     */
    struct Moonster {
        uint256 id;                     // Unique identifier for the Moonster.
        string name;                    // Name of the Moonster.
        string image;                   // Image URI of the Moonster.
        string description;             // Description of the Moonster.
        string[] types;                 // Types of the Moonster (e.g., "Fire", "Water").
        string[] abilities;             // Abilities of the Moonster.
        Stat[] stats;                   // Array of stats for the Moonster.
        uint256 height;                 // Height of the Moonster.
        uint256 weight;                 // Weight of the Moonster.
        uint256 baseExperience;         // Base experience points of the Moonster.
        Evolution[] evolutionChain;     // Evolution chain of the Moonster.
        string[] strengths;             // Strengths of the Moonster (types it is strong against).
        string[] weaknesses;            // Weaknesses of the Moonster (types it is weak against).
        string[] resistant;             // Types the Moonster is resistant to.
        string[] vulnerable;            // Types the Moonster is vulnerable to.
        string locationAreaEncounters;  // Location where the Moonster can be encountered.
        string location;                // Specific location detail.
        uint256 chance;                 // Capture chance percentage for the Moonster.
    }

    /**
     * @dev Struct to represent a counter relationship between Moonsters.
     */
    struct Counter {
        uint256 id;         // Unique identifier for the counter relationship.
        uint256 moonsterId; // ID of the Moonster.
        uint256 counterId;  // ID of the Moonster that counters the first one.
    }

    /**
     * @dev Struct to represent the result of a comparison between two Moonsters.
     */
    struct ComparisonResult {
        uint256 moonster1Id;            // ID of the first Moonster.
        uint256 moonster2Id;            // ID of the second Moonster.
        uint256 moonster1StatTotal;     // Total stat value for the first Moonster.
        uint256 moonster2StatTotal;     // Total stat value for the second Moonster.
        bool moonster1HasTypeAdvantage; // Whether the first Moonster has a type advantage.
        bool moonster2HasTypeAdvantage; // Whether the second Moonster has a type advantage.
        string winner;                  // Result of the comparison ("Moonster1", "Moonster2", or "Tie").
    }

    /// @dev Mapping from Moonster ID to Moonster details.
    mapping(uint256 => Moonster) public moonsters;
    /// @dev Mapping from Moonster name (lowercase) to Moonster ID for lookup.
    mapping(string => uint256) public nameToId;
    /// @dev Mapping from counter ID to Counter details.
    mapping(uint256 => Counter) public counters;
    /// @dev Total number of Moonsters in the contract.
    uint256 public moonsterCount;
    /// @dev Total number of counter relationships in the contract.
    uint256 public counterCount;

    /**
     * @dev Emitted when a new Moonster is added to the contract.
     * @param id The ID of the newly added Moonster.
     * @param name The name of the newly added Moonster.
     */
    event MoonsterAdded(uint256 id, string name);

    /**
     * @dev Emitted when a new counter relationship is added.
     * @param id The ID of the counter relationship.
     * @param moonsterId The ID of the Moonster.
     * @param counterId The ID of the Moonster that counters the first one.
     */
    event CounterAdded(uint256 id, uint256 moonsterId, uint256 counterId);

    /**
     * @dev Emitted when a new designer is assigned the DESIGNER_ROLE.
     * @param designer The address of the newly assigned designer.
     */
    event DesignerAssigned(address designer);

    /**
     * @dev Constructor that initializes the contract with default roles.
     * Grants DEFAULT_ADMIN_ROLE and DESIGNER_ROLE to the deployer.
     */
    constructor() {
        _setRoleAdmin(DESIGNER_ROLE, DEFAULT_ADMIN_ROLE);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DESIGNER_ROLE, msg.sender);
    }

    /**
     * @dev Converts a string to lowercase.
     * @param str The input string to convert.
     * @return The lowercase version of the input string.
     */
    function toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            if (uint8(bStr[i]) >= 65 && uint8(bStr[i]) <= 90) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    /**
     * @dev Adds a new Moonster to the contract.
     * @param _id The unique ID of the Moonster.
     * @param _name The name of the Moonster.
     * @param _image The image URI of the Moonster.
     * @param _description The description of the Moonster.
     * @param _types The types of the Moonster.
     * @param _abilities The abilities of the Moonster.
     * @param _stats The stats of the Moonster.
     * @param _height The height of the Moonster.
     * @param _weight The weight of the Moonster.
     * @param _baseExperience The base experience points of the Moonster.
     * @param _evolutionChain The evolution chain of the Moonster.
     * @param _strengths The strengths of the Moonster.
     * @param _weaknesses The weaknesses of the Moonster.
     * @param _resistant The types the Moonster is resistant to.
     * @param _vulnerable The types the Moonster is vulnerable to.
     * @param _locationAreaEncounters The location where the Moonster can be encountered.
     * @param _location The specific location detail.
     * @param _chance The capture chance percentage for the Moonster.
     * Requirements:
     * - Caller must have DESIGNER_ROLE.
     * - Moonster ID must not already exist.
     * - Moonster name must not already exist.
     * - Evolution chain IDs must be non-zero.
     */
    function addMoonster(
        uint256 _id,
        string memory _name,
        string memory _image,
        string memory _description,
        string[] memory _types,
        string[] memory _abilities,
        Stat[] memory _stats,
        uint256 _height,
        uint256 _weight,
        uint256 _baseExperience,
        Evolution[] memory _evolutionChain,
        string[] memory _strengths,
        string[] memory _weaknesses,
        string[] memory _resistant,
        string[] memory _vulnerable,
        string memory _locationAreaEncounters,
        string memory _location,
        uint256 _chance
    ) public onlyRole(DESIGNER_ROLE) {
        require(moonsters[_id].id == 0, "Moonster already exists");
        require(nameToId[toLowerCase(_name)] == 0, "Moonster name already exists");

        for (uint256 i = 0; i < _evolutionChain.length; i++) {
            require(_evolutionChain[i].id != 0, "Evolution ID must be non-zero");
        }

        moonsters[_id] = Moonster(
            _id,
            _name,
            _image,
            _description,
            _types,
            _abilities,
            _stats,
            _height,
            _weight,
            _baseExperience,
            _evolutionChain,
            _strengths,
            _weaknesses,
            _resistant,
            _vulnerable,
            _locationAreaEncounters,
            _location,
            _chance
        );

        nameToId[toLowerCase(_name)] = _id;
        moonsterCount++;
        emit MoonsterAdded(_id, _name);
    }

    /**
     * @dev Adds a counter relationship between two Moonsters.
     * @param _id The unique ID of the counter relationship.
     * @param _moonsterId The ID of the Moonster.
     * @param _counterId The ID of the Moonster that counters the first one.
     * Requirements:
     * - Caller must have DESIGNER_ROLE.
     * - Counter ID must not already exist.
     */
    function addCounter(
        uint256 _id,
        uint256 _moonsterId,
        uint256 _counterId
    ) public onlyRole(DESIGNER_ROLE) {
        require(counters[_id].id == 0, "Counter already exists");
        counters[_id] = Counter(_id, _moonsterId, _counterId);
        counterCount++;
        emit CounterAdded(_id, _moonsterId, _counterId);
    }

    /**
     * @dev Assigns the DESIGNER_ROLE to a new address.
     * @param designer The address to assign the DESIGNER_ROLE to.
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE.
     * - Designer address must not be the zero address.
     */
    function assignDesigner(address designer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(designer != address(0), "Invalid designer address");
        _grantRole(DESIGNER_ROLE, designer);
        emit DesignerAssigned(designer);
    }

    /**
     * @dev Transfers ownership of the contract by granting DEFAULT_ADMIN_ROLE to a new address and revoking it from the caller.
     * @param newOwner The address to transfer ownership to.
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE.
     * - New owner address must not be the zero address.
     */
    function transferOwnership(address newOwner) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOwner != address(0), "Invalid owner address");
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Retrieves the details of a Moonster by its ID.
     * @param _id The ID of the Moonster to retrieve.
     * @return The Moonster struct containing all its details.
     * Requirements:
     * - Moonster must exist (ID must be non-zero in the mapping).
     */
    function getMoonsterById(uint256 _id) public view returns (Moonster memory) {
        require(moonsters[_id].id != 0, "Moonster does not exist");
        return moonsters[_id];
    }

    /**
     * @dev Retrieves the details of a Moonster by its name.
     * @param _name The name of the Moonster to retrieve.
     * @return The Moonster struct containing all its details.
     * Requirements:
     * - Moonster must exist (name must map to a non-zero ID).
     */
    function getMoonsterByName(string memory _name) public view returns (Moonster memory) {
        uint256 id = nameToId[toLowerCase(_name)];
        require(id != 0, "Moonster does not exist");
        return moonsters[id];
    }

    /**
     * @dev Retrieves the details of a counter relationship by its ID.
     * @param _id The ID of the counter relationship.
     * @return A tuple containing the counter ID, Moonster ID, and counter Moonster ID.
     */
    function getCounter(uint256 _id) public view returns (uint256, uint256, uint256) {
        Counter memory c = counters[_id];
        return (c.id, c.moonsterId, c.counterId);
    }

    /**
     * @dev Compares two strings for equality using their keccak256 hashes.
     * @param a The first string to compare.
     * @param b The second string to compare.
     * @return True if the strings are equal, false otherwise.
     */
    function stringsEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /**
     * @dev Checks if a string array contains a specific value.
     * @param arr The array of strings to search in.
     * @param value The value to search for.
     * @return True if the value is found in the array, false otherwise.
     */
    function contains(string[] memory arr, string memory value) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (stringsEqual(arr[i], value)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Calculates the total stat value of a Moonster.
     * @param moonster The Moonster whose stats are to be summed.
     * @return The total stat value.
     */
    function calculateStatTotal(Moonster storage moonster) internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < moonster.stats.length; i++) {
            total += moonster.stats[i].value;
        }
        return total;
    }

    /**
     * @dev Compares two Moonsters based on their stats and type advantages.
     * @param moonster1Id The ID of the first Moonster.
     * @param moonster2Id The ID of the second Moonster.
     * @return A ComparisonResult struct containing the comparison details.
     * Requirements:
     * - Both Moonsters must exist.
     */
    function compareMoonsters(uint256 moonster1Id, uint256 moonster2Id) public view returns (ComparisonResult memory) {
        require(moonsters[moonster1Id].id != 0, "Moonster 1 does not exist");
        require(moonsters[moonster2Id].id != 0, "Moonster 2 does not exist");

        Moonster storage moonster1 = moonsters[moonster1Id];
        Moonster storage moonster2 = moonsters[moonster2Id];

        uint256 moonster1StatTotal = calculateStatTotal(moonster1);
        uint256 moonster2StatTotal = calculateStatTotal(moonster2);

        bool moonster1HasTypeAdvantage = false;
        bool moonster2HasTypeAdvantage = false;

        for (uint256 i = 0; i < moonster1.types.length; i++) {
            if (contains(moonster2.weaknesses, moonster1.types[i])) {
                moonster1HasTypeAdvantage = true;
                break;
            }
        }

        for (uint256 i = 0; i < moonster2.types.length; i++) {
            if (contains(moonster1.weaknesses, moonster2.types[i])) {
                moonster2HasTypeAdvantage = true;
                break;
            }
        }

        string memory winner;
        if (moonster1HasTypeAdvantage && !moonster2HasTypeAdvantage) {
            winner = "Moonster1";
        } else if (moonster2HasTypeAdvantage && !moonster1HasTypeAdvantage) {
            winner = "Moonster2";
        } else {
            if (moonster1StatTotal > moonster2StatTotal) {
                winner = "Moonster1";
            } else if (moonster2StatTotal > moonster1StatTotal) {
                winner = "Moonster2";
            } else {
                winner = "Tie";
            }
        }

        return ComparisonResult(
            moonster1Id,
            moonster2Id,
            moonster1StatTotal,
            moonster2StatTotal,
            moonster1HasTypeAdvantage,
            moonster2HasTypeAdvantage,
            winner
        );
    }

    /**
     * @dev Retrieves a paginated list of Moonsters.
     * @param offset The starting index for the list.
     * @param limit The maximum number of Moonsters to return.
     * @return An array of Moonster structs.
     * Requirements:
     * - Offset must be within bounds of the total Moonster count.
     */
    function showListMoonsters(uint256 offset, uint256 limit) public view returns (Moonster[] memory) {
        require(offset < moonsterCount, "Offset out of bounds");
        uint256 endIndex = offset + limit > moonsterCount ? moonsterCount : offset + limit;
        Moonster[] memory result = new Moonster[](endIndex - offset);
        for (uint256 i = offset; i < endIndex; i++) {
            result[i - offset] = moonsters[i];
        }
        return result;
    }
}