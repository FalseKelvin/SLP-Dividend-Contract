const { BITBOX } = require('bitbox-sdk');
const { Contract, Sig } = require('cashscript');
const path = require('path');
const CCDCTOKENID =	"ec10a63a4067dff85a8ba9256dd0c9a86f25f9a4191b7411a54f5c2fdfd19221"; // CCDC V3 token ID
const crowdFundAddress = 'bchtest:qz95aqed425r2esx8mtn6a5rt5jg3xl8mgwhn9476y'; // address holding the BCH for distribution
const network = 'testnet';
    
run();
async function run() {
	// Initialise BITBOX
	const bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

	// Initialise SLP SDK
	const SLPSDK = require("../../slp-sdk/lib/SLP"); // amend depending on where the SLP SDK is stored
	const SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` }); //testnet
  
	// initialise parameters
	var totalCCDCHeld = 0;
	var distributionRate = 0;
	var totalBCHDeposited = 1.0; // for testnet use only, for mainnet refer directly to var balance.balance

	//retrieve address details for crowdfund cash address
	var balance = await SLP.Address.details(crowdFundAddress);

	// retrieve array of CCDC V3 token holders
	var ccdcHolders = await SLP.Utils.balancesForToken(CCDCTOKENID); 
	const ccdcAddrCount = ccdcHolders.length;

	// loop through the array of CCDC token holders to take a snapshot of all SLP balances
	for (var i = 0; i < ccdcAddrCount; i++) {
		console.log('\nCCDC V3 Token holder #' + i + ' ' +
			'\nSLP Address: ' + ccdcHolders[i].slpAddress +
			'\nCCDC V3 tokens held: ' + ccdcHolders[i].tokenBalance);
		totalCCDCHeld = totalCCDCHeld + ccdcHolders[i].tokenBalance // tracks CCDC circulating supply 
	}
  	console.log('\n***Total CCDC V3 tokens in circulation: ' + totalCCDCHeld + ' across ' + i + ' wallets');
	console.log('\n***Total BCH deposited: ' + totalBCHDeposited);
	console.log('Crowd Funding Balance: ' + balance.balance + ' BCH');
	console.log('Total BCH for distribution: ' + totalBCHDeposited + ' BCH for this test');
	  
	// calculate distribution of the airdrop token based on CCDC V3 token balances of each wallet
	distributionRate = totalBCHDeposited / totalCCDCHeld;
  
	console.log('\n***Distribution ratio is: ' + distributionRate.toString() 
		+ ' BCH per 1.0 CCDC SLP token held. \ne.g. holders of 0.5 CCDC will get ' 
		+ (distributionRate/2).toString() + ' BCH.\n');

	// 2nd iteration through array of CCDC holders to send alloted BCH
	for (var i = 0; i < ccdcAddrCount; i++) {
		var sendAmount = ccdcHolders[i].tokenBalance * distributionRate; // calculate the correct BCH to send
		sendBch(ccdcHolders[i].cashAddress, sendAmount); // sends the BCH to the holder's cash address
		console.log('\nSLP Address: ' + ccdcHolders[i].slpAddress +
			'\nCCDC V3 tokens held: ' + ccdcHolders[i].tokenBalance + 
			'\nSent ' +  sendAmount + ' BCH\n');
	}

}

// distribution of the BCH from the crowdfund address to holders of the SLP token
async function sendBch(cashAddress, sendAmount) {
	try {
		//TODO: sends sendAmount to the cashAddress
		// need to decide whether to send via SLP SDK or instantiate Cashscript for sending mechanism		
	}
	catch (err) {
		console.error(`Error in sendBch: `, err)
		console.log(`Error message: ${err.message}`)
    throw err
  }
}

// OPTIONAL: distribution of the SLP token
async function sendToken(fundingAddress, fundingWif, tokenReceiverAddress, bchChangeReceiverAddress, tokenQty) {
  try {

    // Create a config object for minting
    const sendConfig = {
      fundingAddress,
      fundingWif,
      tokenReceiverAddress,
      bchChangeReceiverAddress,
      tokenId: TOKENID,
      amount: tokenQty
    }

    // Generate, sign, and broadcast a hex-encoded transaction for sending the tokens.
    const sendTxId = await SLP.TokenType1.send(sendConfig)

    console.log(`sendTxId: ${util.inspect(sendTxId)}`)

    console.log(`\nView this transaction on the block explorer:`)
    if (NETWORK === `mainnet`)
		console.log(`https://explorer.bitcoin.com/bch/tx/${sendTxId}`)
    else console.log(`https://explorer.bitcoin.com/tbch/tx/${sendTxId}`)
  } catch (err) {
		console.error(`Error in sendToken: `, err)
		console.log(`Error message: ${err.message}`)
    throw err
  }
}
  
module.exports = {
  run,
};
