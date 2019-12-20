var DappToken = artifacts.require("./DappToken.sol");
var DappTokenSale = artifacts.require("./DappTokenSale.sol");

contract('DappTokenSale', (accounts)=>{
    var tokenInstance;
    var tokenSaleInstance;
    var numberOfTokens;
    var tokenPrice      = 1000000000000000; // In wei (smallest uint of ether), it is equal to 0.001 ether
    var availableTokens = 750000; // 75% of 1,000,000 tokens available in the DappToken contract
    var buyer           = accounts[1];
    var seller          = accounts[1];
    var admin           = accounts[0];
    it('initializes token with correct values', ()=>{
        return DappTokenSale.deployed().then((instance)=>{
            tokenSaleInstance = instance;
            return tokenSaleInstance.address;
        }).then((address)=>{
            assert.notEqual(address, 0x0, 'has token address');
            return tokenSaleInstance.tokenContract();
        }).then((address)=>{
            assert.notEqual(address, 0x0, 'has tokenContract address');
            return tokenSaleInstance.tokenPrice();
        }).then((price)=>{
            assert.equal(price, tokenPrice, 'token price set correctly');
        });
    });

    it('facilitates token buy', ()=>{
        return DappToken.deployed().then((instance)=>{
            tokenInstance = instance;
            return DappTokenSale.deployed();
        }).then((instance)=>{
            tokenSaleInstance  = instance;
            return tokenInstance.transfer(tokenSaleInstance.address, availableTokens);
        }).then((receipt)=>{
            numberOfTokens     = 10;
            return tokenSaleInstance.buyTokens(numberOfTokens, {from: buyer, value: numberOfTokens * tokenPrice});
        }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Sell', 'should be the "Sell" event');
            assert.equal(receipt.logs[0].args._buyer, buyer, 'logs the account that purchased the tokens');
            assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased');
            return tokenSaleInstance.tokensSold();
        }).then((amount)=>{
            assert.equal(amount.toNumber(), numberOfTokens, 'the token price paid is correct');
            return tokenInstance.balanceOf(buyer);
        }).then((balance)=>{
            assert.equal(balance, numberOfTokens, 'buyer has right number of tokens');
            return tokenInstance.balanceOf(tokenSaleInstance.address);
        }).then((balance)=>{
            assert.equal(balance, availableTokens - numberOfTokens, 'DappTokenSale contract has right number of tokens');
            return tokenSaleInstance.buyTokens(numberOfTokens, {from: buyer, value: 1}); //Try to purchase 10 tokens for 1 wei and this should raise an error
        }).then(assert.fail).catch((error)=>{
            assert(error.message, 'purchasing numberOfTokens for invalid wei value is not allowed');
            return tokenSaleInstance.buyTokens(800000, {from: buyer, value: numberOfTokens * tokenPrice});
        }).then(assert.fail).catch((error)=>{
            assert(error.message, 'Trying to purchase tokens more than available in the contract');
        });
    });

    it('facilitates the sell token and approves for delegate transfer', ()=>{
         return DappToken.deployed().then((instance)=>{
             tokenInstance = instance;
             return DappTokenSale.deployed();
         }).then((instance)=>{
             tokenSaleInstance = instance;
             numberOfTokens = 3;
             return tokenSaleInstance.sellTokens(numberOfTokens, {from: seller, value: numberOfTokens*tokenPrice});
         }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Sell', 'should be the "Sell" event');
            assert.equal(receipt.logs[0].args._buyer, seller, 'logs the account that purchased the tokens');
            assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased');
            return tokenSaleInstance.tokensSold();
         }).then((amount)=>{
             assert.equal(amount.toNumber(), 10 - numberOfTokens, "The number of tokens given to admin is correct");
             return tokenInstance.approve(seller, numberOfTokens, {from: seller}); //Approving the seller to create the transaction from the seller account
         }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Approval', 'should be the approval event');
            assert.equal(receipt.logs[0].args._owner, seller, 'the admin is the owner to approve the sender to create transactions');
            assert.equal(receipt.logs[0].args._spender, seller, 'the spender is the the accounts[1] that will transfer tokens later to admin');
            assert.equal(receipt.logs[0].args._value, numberOfTokens, 'logs the transfer amount');
            return tokenInstance.transferFrom.call(seller, admin, numberOfTokens, {from: seller});
         }).then((success)=>{
             assert.equal(success, true, 'the transfer from seller to admin will be able to take place');
             return tokenInstance.transferFrom(seller, admin, numberOfTokens, {from: seller}); //Transferring tokens from seller to the admin account
         }).then((receipt)=>{
             return tokenInstance.balanceOf(seller);
         }).then((balance)=>{
             assert.equal(balance.toNumber(), 7, 'The transfer of 3 tokens from seller to admin took place');
             return tokenInstance.balanceOf(admin);
         }).then((balance)=>{
             assert.equal(balance.toNumber(), 250003, 'the admin has received 3 tokens from seller');
         });
    });

    it('facilitates the endSale', ()=>{
        return DappToken.deployed().then((instance)=>{
            tokenInstance = instance;
            return DappTokenSale.deployed();
        }).then((instance)=>{
            tokenSaleInstance = instance;
            return tokenSaleInstance.endSale({from: buyer});
        }).then(assert.fail).catch((error)=>{
            assert(error.message, 'cannot endSale from someone other than admin');
            return tokenSaleInstance.endSale({from: admin});
        }).then((receipt)=>{
            return tokenInstance.balanceOf(admin);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 999993, 'balance left with admin after ending sale');
            return tokenInstance.balanceOf(tokenSaleInstance.address);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 0, 'contract has been reset');
        });
    });
})