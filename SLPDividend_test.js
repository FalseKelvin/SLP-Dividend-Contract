const { BITBOX } = require('bitbox-sdk');
const { Contract, Sig } = require('cashscript');
const path = require('path');
const CCDCTOKENID =	"ec10a63a4067dff85a8ba9256dd0c9a86f25f9a4191b7411a54f5c2fdfd19221"; // CCDC V3 token ID
const crowdFundAddress = 'bchtest:qz95aqed425r2esx8mtn6a5rt5jg3xl8mgwhn9476y'; // address holding the BCH for distribution
const network = 'testnet';
    
run();
async function run() {
	
	// Initialise SLP SDK
	const SLPSDK = require("../../slp-sdk/lib/SLP"); // amend depending on where the SLP SDK is stored
	
	// instantiate the SLP SDK based on the chosen network
	if (network === `mainnet`)
		SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
	else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` })

	// initialise distribution variables
	var totalCCDCHeld = 0;
	var distributionRate = 0;
	var totalBCHDeposited = 1.0; // for testnet use only, for mainnet refer directly to var balance.balance

	// retrieves and decodes the CCDC V3 token ID permanently stored onchain via blockpress
	let memopress = require('memopress');
	var memo = memopress.decode('OP_RETURN 653 6a028d024065633130613633613430363764666638356138626139323536646430633961383666323566396134313931623734313161353466356332666466643139323231').message;
	const onchainTokenId = memo.split('@').pop(); // removes the '@' and opcode from buffer

	// boolean outcome from cashscript method
	var validation = await validateTokenId(CCDCTOKENID, onchainTokenId);
	
	if (validation == true) { // if token ID matches the onchain version

		//retrieve address details for crowdfund cash address
		var balance = await SLP.Address.details(crowdFundAddress);

		// retrieve array of CCDC V3 token holders
		var ccdcHolders = await SLP.Utils.balancesForToken(CCDCTOKENID); 
		const ccdcAddrCount = ccdcHolders.length;

		// loop through the array of CCDC token holders to take a snapshot of all SLP balances
		for (var i = 0; i < ccdcAddrCount; i++) {
			totalCCDCHeld = totalCCDCHeld + ccdcHolders[i].tokenBalance // tracks CCDC circulating supply 
		}
		
		// calculate distribution of the airdrop token based on CCDC V3 token balances of each wallet
		distributionRate = totalBCHDeposited / totalCCDCHeld;
	  
		console.log('\n***Distribution ratio is: ' + distributionRate.toString() 
			+ ' BCH per 1.0 CCDC SLP token held. \ne.g. holders of 0.5 CCDC will get ' 
			+ (distributionRate/2).toString() + ' BCH.\n');

		// 2nd iteration through array of CCDC holders to send alloted BCH
		for (var i = 0; i < ccdcAddrCount; i++) {
			var sendAmount = ccdcHolders[i].tokenBalance * distributionRate; // calculate the correct BCH to send
			sendBch(ccdcHolders[i].cashAddress, sendAmount); // sends the BCH to the holder's cash address
		}

	} else { // if the token ID did not match the onchain version
		
		console.log('Error: Token ID did not match onchain version');
	}
}

// instantiates cashscript and calls on SLPDividend.cash to validate
// the token ID being used
async function validateTokenId(localId, onchainId) {
		
	// Initialise BITBOX
	const bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

	// Initialise HD node and alice's keypair
	const rootSeed = bitbox.Mnemonic.toSeed('CashScript');
	const hdNode = bitbox.HDNode.fromSeed(rootSeed, network);
	const crowdfund = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 0));

	// Derive alice's public key and public key hash
	const crowdfundPk = bitbox.ECPair.toPublicKey(crowdfund);
	const crowdfundPkh = bitbox.Crypto.hash160(crowdfundPk);

	// Compile the P2PKH Cash Contract
	const P2PKH = Contract.compile(path.join(__dirname, 'SLPDividend.cash'), network);

	// Instantiate a new P2PKH contract with constructor arguments: { pkh: crowdfundPkh }
	const instance = P2PKH.new(crowdfundPkh);

	try {
		// Call the validateTokenId function in cashscript
		// returns true if no error is caught
		var tx = await instance.functions.validateTokenID(localId, onchainId);
		return true;
	} catch (err) {
		// returns false if comparison fails
		console.log('Error: ' + err);
		return false;
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
