// ============== Initialisation Parameters ====================
const { BITBOX } 			= require('bitbox-sdk');
const SLPSDK 				= require("../../slp-sdk/lib/SLP"); // amend depending on where your SLP SDK is stored
const { Contract, Sig, FailedRequireError } = require('cashscript');
const path 				= require('path');
const CCDCTOKENID 			= "ec10a63a4067dff85a8ba9256dd0c9a86f25f9a4191b7411a54f5c2fdfd19221"; // CCDC token ID on testnet
const crowdFundAddress 			= 'INSERT CROWDFUND ADDRESS'; // address holding the BCH for distribution
const decodeTx 				= 'OP_RETURN 653 6a028d024065633130613633613430363764666638356138626139323536646430633961383666323566396134313931623734313161353466356332666466643139323231'
const smartContractMnemonic 		= 'INSERT CROWDFUND MNEMONIC';
var totalBCHForDistribution 		= 0.5; // total BCH for distribution in this airdrop
const network 				= 'testnet';
// =============================================================

// Initialise BITBOX based on chosen network
if (network === 'mainnet')
	bitbox = new BITBOX({ restURL: 'https://rest.bitcoin.com/v2/' })
else bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

// instantiate the SLP SDK based on the chosen network
if (network === `mainnet`)
	SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });

run();
async function run() {

	// initialise distribution variables
	var totalCCDCHeld = 0;
	var distributionRate = 0;

	// retrieves and decodes the CCDC V3 token ID permanently stored onchain via blockpress
	let memopress = require('memopress');
	var memo = memopress.decode(decodeTx).message;
	const onchainTokenId = memo.split('@').pop(); // removes the '@' and opcode from buffer

	// calls the cashscript contract to validate the token onchain
	var validation = await validateTokenId(CCDCTOKENID, onchainTokenId);

	if (validation == true) { // if token ID matches the onchain version

		//retrieve address details for crowdfund cash address
		var balance = await SLP.Address.details(crowdFundAddress);

		// retrieve array of CCDC token holders
		var ccdcHolders = await SLP.Utils.balancesForToken(CCDCTOKENID);
		const ccdcAddrCount = ccdcHolders.length;

		// loop through the array of CCDC token holders to take a snapshot of all SLP balances
		for (var i = 0; i < ccdcAddrCount; i++) {
			totalCCDCHeld = totalCCDCHeld + ccdcHolders[i].tokenBalance // tracks CCDC circulating supply
			console.log(ccdcHolders[i].slpAddress + ' ' + ccdcHolders[i].tokenBalance);
		}

		// calculate distribution of the airdrop token based on CCDC token balances of each wallet
		distributionRate = totalBCHForDistribution / totalCCDCHeld;

		console.log('\n***Distribution ratio is: ' + distributionRate.toString()
			+ ' BCH per 1.0 CCDC SLP token held. \ne.g. holders of 0.5 CCDC will get '
			+ (distributionRate/2).toString() + ' BCH.\n');

		// passes the array of token holders for BCH distribution
		sendBch(ccdcHolders, distributionRate, ccdcAddrCount);


	} else { // if the token ID did not match the onchain version

		console.log('Error: Token ID did not match onchain version');
	}
}

// instantiates cashscript and calls on CCDC_Dividend contract to validate
// the token ID being used
async function validateTokenId(localId, onchainId) {

	// Initialise HD node and contract's keypair
	const rootSeed = bitbox.Mnemonic.toSeed(smartContractMnemonic);
	const hdNode = bitbox.HDNode.fromSeed(rootSeed, network);
	const crowdfund = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 0));

	// Derive crowdfund's public key and public key hash
	const crowdfundPk = bitbox.ECPair.toPublicKey(crowdfund);
	const crowdfundPkh = bitbox.Crypto.hash160(crowdfundPk);

	// Compile the P2PKH Cash Contract
	const P2PKH = Contract.compile(path.join(__dirname, 'CCDC_Dividend.cash'), network);

	// Instantiate a new P2PKH contract with constructor arguments: { pkh: crowdfundPkh }
	const instance = P2PKH.new(crowdfundPkh);

	console.log('instance.address is: ' + instance.address);

	try {
		// Call the validateTokenId function in cashscript returns true if no error is caught
		// note the '.send()' is needed so that validation is carried out on the network, otherwise
		//		it is no different than a local client side validation.
		var tx = await instance.functions.validateTokenID(localId, onchainId).send(instance.address,1);
		return true;
	} catch (error) {
		if (error instanceof FailedRequireError) {
			// returns false if comparison fails
			console.log('Error: token ID mismatch');
			return false;
		} else {
			console.log('Error: ' + error);
			return false;
		}
	}
}

// distribution of the BCH from the crowdfund address to holders of the SLP token
async function sendBch(ccdcHolders, distributionRate, ccdcAddrCount) {

  try {

    // convert cash addresses into legacy addresses
    const SEND_ADDR_LEGACY = bitbox.Address.toLegacyAddress(crowdFundAddress);

    // retrieve utxos of address
    const u = await bitbox.Address.utxo(crowdFundAddress);
    const utxo = findBiggestUtxo(u.utxos);
    const originalAmount = utxo.satoshis; // original total sats in address
    const vout = utxo.vout;
    const txid = utxo.txid;

    // initiates TransactionBuilder on the selected network
    const transactionBuilder = new bitbox.TransactionBuilder(network);

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = 300 * ccdcAddrCount;
    console.log(`byteCount: ${byteCount}`);
    const satoshisPerByte = 1.2;
    const txFee = Math.floor(satoshisPerByte * byteCount);
    console.log(`txFee: ${txFee}`);

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    var totalSatsForDistribution = 0; // tracks the total sats for distribution

    // iteration through array of token holders to build the pay2many transaction output
    for (var i = 0; i < ccdcAddrCount; i++) {
	var sendAmountBch = ccdcHolders[i].tokenBalance * distributionRate; // calculate the correct BCH to send
	var sendAmountSat = Math.floor(bitbox.BitcoinCash.toSatoshi(sendAmountBch)); // convert from BCH to SATs
	var receiveAddress = SLP.Address.toCashAddress(ccdcHolders[i].slpAddress);

	console.log('\nTx #: ' + (i+1) + ' of ' + ccdcAddrCount + '\nSending '
	+ sendAmountBch + ' bch to ' + receiveAddress);

	// retrieve the corresponding cash address for each SLP address
	const RECV_ADDR_LEGACY = bitbox.Address.toLegacyAddress(receiveAddress);

	// keep track of total sats for this tx
	totalSatsForDistribution = totalSatsForDistribution + sendAmountSat;

	// add output w/ address and amount to send
	transactionBuilder.addOutput(receiveAddress, sendAmountSat);
    }

    // amount to send back to the sending address.
    // It's the original amount - 1.2 sat/byte for tx size
    const remainder = originalAmount - totalSatsForDistribution - txFee;

	// final output for the remainder sats to return to the sender
	transactionBuilder.addOutput(crowdFundAddress, remainder);

    // since satoshi's can't be fractional at time of code
    const satoshisToSend = Math.floor(totalSatsForDistribution - txFee);

    // Generate a change address from a Mnemonic of a private key.
    const change = changeAddrFromMnemonic(smartContractMnemonic)

    // Generate a keypair from the change address.
    const keyPair = bitbox.HDNode.toKeyPair(change)

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()

    // Broadcast transation to the network
    const txidStr = await bitbox.RawTransactions.sendRawTransaction([hex])
    console.log(`Transaction ID: ${txidStr}`)

  } catch (err) {
    console.log(`error: `, err)
  }
}

// *** Helpder functions imported from Bitbox SDK below ***

// Generate a change address from a Mnemonic of a private key.
function changeAddrFromMnemonic(mnemonic, network) {
  const rootSeed = bitbox.Mnemonic.toSeed(mnemonic)
  const masterHDNode = bitbox.HDNode.fromSeed(rootSeed, network)
  const account = bitbox.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

  // derive the first external change address HDNode which is going to spend utxo
  const change = bitbox.HDNode.derivePath(account, "0/0")
  return change
}

// Get the balance in BCH of a BCH address.
async function getBCHBalance(addr, verbose) {
  try {
    const bchBalance = await bitbox.Address.details(addr)

    if (verbose) console.log(bchBalance)

    return bchBalance.balance
  } catch (err) {
    console.error(`Error in getBCHBalance: `, err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}


module.exports = {
  run,
};
