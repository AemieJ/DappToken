var DappToken = artifacts.require("./DappToken.sol");

contract("DappToken" , (accounts)=> {
    var tokenInstance; 

    it('initializes contract with correct values' , ()=>{
            return DappToken.deployed().then((instance)=>{
                tokenInstance = instance;
                return tokenInstance.name();
            }).then((name)=>{
                assert.equal(name, 'DApp Token', 'correct name has been set');
                return tokenInstance.symbol();
            }).then((symbol)=>{
                assert.equal(symbol, 'DAPP', 'correct symbol has been set');
                return tokenInstance.standard();
            }).then((standard)=>{
                assert.equal(standard, 'DApp Token v1.0', 'correct standard has been set');
            });
    });

    it('allocates the initial supply upon deployment', ()=>{
        return DappToken.deployed().then((instance)=>{
          tokenInstance = instance;
          return tokenInstance.totalSupply();
        }).then((totalSupply)=>{
          assert.equal(totalSupply.toNumber(), 1000000, 'sets the total supply to 1,000,000');
          return tokenInstance.balanceOf(accounts[0]);
        }).then((adminBalance)=>{
          assert.equal(adminBalance.toNumber(), 1000000, 'it allocates the initial supply to the admin account');
        });
    });

    it('transfers ownnership of tokens', ()=>{
        return DappToken.deployed().then((instance)=>{
            tokenInstance = instance;
            return tokenInstance.transfer.call(accounts[1], 99999999999999999999999);
        }).then(assert.fail).catch((error)=>{               
            assert(error.message, 'error is just printed');
            return tokenInstance.transfer.call(accounts[1], 250000, {from: accounts[0]});
        }).then((success)=>{
            assert.equal(success, true, 'it must return true for transfer to occur');
            return tokenInstance.transfer(accounts[1], 250000, {from: accounts[0]});
        }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
            assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are transferred from');
            assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are transferred to');
            assert.equal(receipt.logs[0].args._value, 250000, 'logs the transfer amount');
            return tokenInstance.balanceOf(accounts[1]);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 250000, 'adds the amount to the receiving account');
            return tokenInstance.balanceOf(accounts[0]);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 750000, 'deducts the amount from the sending account');
        });
    });

    it('approves tokens for delegate transfer', ()=>{
        return DappToken.deployed().then((instance)=>{
            tokenInstance = instance;
            return tokenInstance.approve.call(accounts[1], 100);
        }).then((success)=>{
            assert.equal(success, true, 'it is approved for the account to use 100 token');
            return tokenInstance.approve(accounts[1], 100, {from: accounts[0]});
        }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Approval', 'should be the "Approval" event');
            assert.equal(receipt.logs[0].args._owner, accounts[0], 'logs the account the tokens are authorized by');
            assert.equal(receipt.logs[0].args._spender, accounts[1], 'logs the account the tokens are authorized to');
            assert.equal(receipt.logs[0].args._value, 100, 'logs the transfer amount');
            return tokenInstance.allowance(accounts[0], accounts[1]);
        }).then((allowance)=>{
            assert.equal(allowance.toNumber(), 100, 'checks the amount of tokens left with the sender');
        });
    });

    it('handles the delegate transfer', ()=>{
        return DappToken.deployed().then((instance)=>{
            tokenInstance  = instance;
            fromAccount    = accounts[2];
            toAccount      = accounts[3];
            spenderAccount = accounts[4];
            return tokenInstance.transfer(fromAccount, 100, {from: accounts[0]});
        }).then((receipt)=>{
            // Approve spending account to spend 10 tokens from the fromAccount
            return tokenInstance.approve(spenderAccount, 10, {from: fromAccount});
        }).then((receipt)=>{
            // Try transferring tokens larger than the fromAccount's balance
            return tokenInstance.transferFrom(fromAccount, toAccount, 9999, {from: spenderAccount});
        }).then(assert.fail).catch((error)=>{
            assert(error.message, 'error because trying to transfer token larger than balance');
            // Try transferring tokens larger than the spenderAccount is approved to spend
            return tokenInstance.transferFrom(fromAccount, toAccount, 20, {from: spenderAccount});
        }).then(assert.fail).catch((error)=>{
            assert(error.message, 'error because trying to transfer token that spenderAccount is allowed to');
            return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, {from: spenderAccount});
        }).then((success)=>{
            assert.equal(success, true, 'the transfer from fromAccount to toAccount is successfully implemented by spenderAccount');
            return tokenInstance.transferFrom(fromAccount, toAccount, 10, {from: spenderAccount});
        }).then((receipt)=>{
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
            assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the tokens are transferred from');
            assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the tokens are transferred to');
            assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount');
            return tokenInstance.balanceOf(fromAccount);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 90, 'balance of fromAccount');
            return tokenInstance.balanceOf(toAccount);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 10, 'balance of toAccount');
            return tokenInstance.balanceOf(spenderAccount);
        }).then((balance)=>{
            assert.equal(balance.toNumber(), 0, 'balance of allowance for spenderAccount');
        });
    });
})