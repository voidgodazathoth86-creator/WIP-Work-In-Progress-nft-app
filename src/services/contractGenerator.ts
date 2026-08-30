import { TokenStandard, BlockchainNetwork } from '../types';

export interface ContractConfig {
  name: string;
  symbol: string;
  standard: TokenStandard;
  chainId: BlockchainNetwork;
  maxSupply: number;
  royaltyPercentage: number;
  royaltyPayoutAddress: string;
  isBurnable?: boolean;
  isPausable?: boolean;
  isEnumerable?: boolean;
  enforceOperatorFilter?: boolean;
  baseUri?: string;
  mintPrice?: number;
  maxPerWallet?: number;
}

export function generateSolidityContract(config: ContractConfig): string {
  const isERC721 = config.standard === 'ERC-721';
  const cleanName = (config.name || 'CustomNFT').replace(/[^a-zA-Z0-9]/g, '');
  const contractName = cleanName ? `${cleanName}Contract` : 'CustomNFTContract';
  const symbol = (config.symbol || 'NFT').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const royaltyBasisPoints = Math.round((config.royaltyPercentage || 0) * 100); // 7.5% -> 750 bps
  const payoutAddress = config.royaltyPayoutAddress || '0xYourWalletAddress';

  if (isERC721) {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
${config.isBurnable ? 'import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";\n' : ''}${config.isPausable ? 'import "@openzeppelin/contracts/security/Pausable.sol";\n' : ''}import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ${contractName}
 * @dev Custom ERC-721 Smart Contract with EIP-2981 On-Chain Royalties (${config.royaltyPercentage}%)
 * Generated via NexusNFT Studio Protocol
 */
contract ${contractName} is 
    ERC721, 
    ERC2981, 
    ${config.isBurnable ? 'ERC721Burnable, ' : ''}${config.isPausable ? 'Pausable, ' : ''}Ownable 
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = ${config.maxSupply || 10000};
    uint256 public mintPrice = ${config.mintPrice || 0} ether;
    uint256 public maxMintPerWallet = ${config.maxPerWallet || 10};
    string private _baseTokenURI = "${config.baseUri || 'ipfs://QmNexusBaseGateway/'}";

    event RoyaltyUpdated(address indexed receiver, uint96 feeNumerator);
    event NFTMinted(address indexed minter, uint256 indexed tokenId);

    constructor() ERC721("${config.name || 'Custom Collection'}", "${symbol}") Ownable(msg.sender) {
        // Pre-configure EIP-2981 Royalty (${config.royaltyPercentage}% = ${royaltyBasisPoints} bps)
        _setDefaultRoyalty(${payoutAddress}, ${royaltyBasisPoints});
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function setRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 2500, "Royalty cannot exceed 25%");
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    function mint(address to) public payable returns (uint256) {
        ${config.isPausable ? 'require(!paused(), "Minting is paused");\n        ' : ''}require(_tokenIdCounter.current() < MAX_SUPPLY, "Max supply reached");
        if (msg.sender != owner()) {
            require(msg.value >= mintPrice, "Insufficient payment");
            require(balanceOf(to) < maxMintPerWallet, "Exceeds max per wallet");
        }

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);

        emit NFTMinted(to, tokenId);
        return tokenId;
    }

    ${config.isPausable ? `function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
` : ''}
    // Interface resolution for ERC-721 and ERC-2981
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
}`;
  } else {
    // ERC-1155 Multi-Token Standard
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
${config.isBurnable ? 'import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";\n' : ''}${config.isPausable ? 'import "@openzeppelin/contracts/security/Pausable.sol";\n' : ''}import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev Custom ERC-1155 Multi-Token Contract with EIP-2981 On-Chain Royalties (${config.royaltyPercentage}%)
 * Generated via NexusNFT Studio Protocol
 */
contract ${contractName} is 
    ERC1155, 
    ERC2981, 
    ${config.isBurnable ? 'ERC1155Burnable, ' : ''}${config.isPausable ? 'Pausable, ' : ''}Ownable 
{
    string public name = "${config.name || 'Custom Multi-Token'}";
    string public symbol = "${symbol}";
    uint256 public constant MAX_SUPPLY_PER_EDITION = ${config.maxSupply || 1000};
    uint256 public mintPrice = ${config.mintPrice || 0} ether;

    mapping(uint256 => uint256) public totalSupply;
    event RoyaltyUpdated(address indexed receiver, uint96 feeNumerator);

    constructor() ERC1155("${config.baseUri || 'ipfs://QmNexus1155Gateway/{id}.json'}") Ownable(msg.sender) {
        // Pre-configure EIP-2981 Royalty (${config.royaltyPercentage}% = ${royaltyBasisPoints} bps)
        _setDefaultRoyalty(${payoutAddress}, ${royaltyBasisPoints});
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function setRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 2500, "Royalty cannot exceed 25%");
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        payable
    {
        ${config.isPausable ? 'require(!paused(), "Contract is paused");\n        ' : ''}require(totalSupply[id] + amount <= MAX_SUPPLY_PER_EDITION, "Edition supply cap reached");
        if (msg.sender != owner()) {
            require(msg.value >= mintPrice * amount, "Insufficient funds sent");
        }

        totalSupply[id] += amount;
        _mint(account, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < ids.length; i++) {
            totalSupply[ids[i]] += amounts[i];
        }
        _mintBatch(to, ids, amounts, data);
    }

    ${config.isPausable ? `function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
` : ''}
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}`;
  }
}
