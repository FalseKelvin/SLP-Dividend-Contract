# SLP-Dividend-Contract - Work in progress

***Use Case***
- X number of users currently hold the SLP token called CCDC v3.
- 1M x PANDA SLP tokens were recently minted and the corresponding BCH deposited to the PANDA address are to be distributed to holders of CCDC V3
- The amount of BCH to be distributed for each CCDC holder will be calculated based on the amount of CCDC in each holder's SLP address

***Functions currently working (via SLPDividend.js)***
1. Takes a snapshot of all CCDC token holders and retrieves the amount of CCDC V3 tokens they hold in their SLP addresses
2. A distribution rate is calculated by dividing the total BCH deposited by the total amount of CCDC supply

***Challenges - help needed***
~~~
  //TODO: move the following logic onchain
  //
  // Initiate a second loop through tokenHolders Array to send:
  //	1. (distributionRate * tokenHolder.tokenBalance) worth of BCH tokens to tokenHolder.cashAddress
  //	2. decide whether the sending mechanism should be done via SLP SDK or to instantiate Cashscript
  //
  // Challenges:
  //	1. No existing BCH op codes to store and retrieve data, hence not sure of how the contract to keep 'state'
  //  2. No loop functions in cashscript yet so unable to traverse the array onchain - a security risk
  //	3. No * operand due to incompatibility with Bitcoin script, so can't calculate distribution ratio onchain - a security risk
  //  4. Figure out logic to set aside transaction fees for each dividend distribution
~~~

***Getting started***

Prerequisites: Install [SLP SDK](https://github.com/Bitcoin-com/slp-sdk) and [Cashscript SDK](https://developer.bitcoin.com/cashscript/docs/getting-started) beforehand

Clone the repo and run the client logic in SLPDividend.js
~~~
git clone https://github.com/fifikobayashi/SLP-Dividend-Contract
cd SLP-Dividend-Contract
node SLPDividend_test.js
~~~

 
![Current output from SLPDividend.js](https://raw.githubusercontent.com/fifikobayashi/SLP-Dividend-Contract/master/SLP%20dividend.png)
