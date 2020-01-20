# SLP-Dividend-Contract - Work in progress

***Use Case***
- X number of users currently hold a particular SLP token
- The corresponding BCH deposited to a crowdsale address are to be distributed to holders of the SLP token
- The amount of BCH to be distributed for each token holder will be calculated based on the amount of tokens in each holder's SLP address

***Functions currently working (via SLPDividend.js)***
1. Takes a snapshot of all CCDC token holders and retrieves the amount of tokens they hold in their SLP addresses
2. Calls on a CashScript contract to validate the token ID being used aginast the official token ID stored onchain via blockpress
3. A distribution rate is calculated by dividing the total BCH deposited by the total amount of token supply
4. BCH is sent to each token holder based on their distribution rate

***Challenges - help needed***
~~~
  // Remaining issues:
  //  * getting a 'bchtest:blahdsadfasdfdsenktvfdz has no matching Script' error when sending the BCH. 
  //  Need to change sending logic to be a pay to many rather than looping through the array of token holders.

  ~~~

***Getting started***

Prerequisites: Install [SLP SDK](https://github.com/Bitcoin-com/slp-sdk) and [Cashscript SDK](https://developer.bitcoin.com/cashscript/docs/getting-started) beforehand

Clone the repo and run the client logic in SLPDividend.js
~~~
git clone https://github.com/fifikobayashi/SLP-Dividend-Contract
cd SLP-Dividend-Contract
node CCDC_Dividend.js
~~~

 
![Current output from SLPDividend.js](https://raw.githubusercontent.com/fifikobayashi/SLP-Dividend-Contract/master/Screenshots/SLP%20dividend%20-%20send%20output.png)
