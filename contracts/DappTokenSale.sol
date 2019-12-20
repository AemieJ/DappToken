pragma solidity ^0.5.0;

import "./DappToken.sol";

contract DappTokenSale {
    address payable admin;
    DappToken public tokenContract;
    uint256 public tokenPrice;
    uint256 public tokensSold;

    event Sell(address _buyer, uint256 _amount);

    constructor(DappToken _tokenContract, uint256 _tokenPrice) public {
        admin         = msg.sender;
        tokenContract = _tokenContract;
        tokenPrice    = _tokenPrice;
    }

    // SAFE ARITHMETIC FOR THE CONTRACT
    function multiply(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
    }

    // BUYING TOKEN SALES
    function buyTokens(uint256 _numberOfTokens) public payable {
        require(msg.value == multiply(_numberOfTokens, tokenPrice));
        // *Require to check that the contract has enough number of tokens
        require(tokenContract.balanceOf(address(this)) >= _numberOfTokens);
        // *Require to verify that transfer is successful
        emit Sell(msg.sender, _numberOfTokens);
        tokensSold += _numberOfTokens;
        
        require(tokenContract.transfer(msg.sender, _numberOfTokens));
    }

    // TRANSFER TOKEN BACK TO ADMIN
    function sellTokens(uint256 _numberOfTokens) public payable{ 
        require(msg.value == multiply(_numberOfTokens, tokenPrice));
        require(tokenContract.balanceOf(msg.sender) >= _numberOfTokens);

        emit Sell(msg.sender, _numberOfTokens);
        tokensSold -= _numberOfTokens;

        require(tokenContract.approve(msg.sender, _numberOfTokens));
    }

    // ENDING THE TOKEN SALE
    function endSale() public {
        require(msg.sender == admin);
        require(tokenContract.transfer(admin, tokenContract.balanceOf(address(this))));

        admin.transfer(address(this).balance);
    }
}