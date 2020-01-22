# SLP-Dividend-Contract - successfully tested on testnet

***Use Case***
- X number of users currently hold a particular SLP token
- The corresponding BCH deposited to a crowdsale address are to be distributed to holders of the SLP token
- The amount of BCH to be distributed for each token holder will be calculated based on the amount of tokens in each holder's SLP address

***Functions Overview***
1. Takes a snapshot of all CCDC token holders and retrieves the amount of tokens they hold in their SLP addresses
2. Calls on a CashScript contract to validate the token ID being used aginst the official token ID stored onchain via blockpress
3. A distribution rate is calculated by dividing the total BCH deposited by the total amount of token supply
4. Builds a Pay2Many transaction output and sends BCH to each token holder based on their distribution rate

***STATUS: Successfully tested on Testnet***
~~~
22nd Jan: 
Successfully working on testnet. Ready for independent testing and code audit.

Pre-Mainnet runsheet:
- publish CCDC token ID from mainnet onto memo via blockpress
- change CCDCTOKENID in js to mainnet token ID
- set decodeTx to OP RETURN 653 + new token ID
- change network constant to mainnet
- change totalBCHForDistribution to desired airdrop amount
- set crowdFundAddress, crowdFundAddressWIF, smartContractMnemonic parameters
- send some sats to the mainnet CashScript contract for validation transaction
- TEST1: comment out body of sendBCH() and do a read only mainnet snapshot as a test
- TEST2: uncomment sendBCH() and set totalBCHForDistribution to 0.1 as mainnet test
- PROD RUN: run full distribution logic

  ~~~

***Getting started***

1. [Install Bixbox SDK](https://developer.bitcoin.com/bitbox/docs/getting-started)
2. [Install SLP SDK](https://github.com/Bitcoin-com/slp-sdk)
3. [Install Cashscript SDK 0.3.1 or above](https://developer.bitcoin.com/cashscript/docs/getting-started)
4. [Install Memopress](https://developer.bitcoin.com/tutorials/memopress/)
5. Clone the repo and run the client logic in CCDC_Dividend.js
~~~
git clone https://github.com/fifikobayashi/SLP-Dividend-Contract
cd SLP-Dividend-Contract
node CCDC_Dividend.js
~~~

 
![Current output from SLPDividend.js](https://raw.githubusercontent.com/fifikobayashi/SLP-Dividend-Contract/master/Screenshots/SLP%20Dividend%20-%202020-01-22.PNG)
