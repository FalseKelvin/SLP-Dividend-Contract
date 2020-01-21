// ============== Initialisation Parameters ====================
const { BITBOX }			= require('bitbox-sdk');
const SLPSDK 				= require("../../slp-sdk/lib/SLP"); // amend depending on where your SLP SDK is stored
const { Contract, Sig, FailedRequireError } = require('cashscript');
const path 				= require('path');
const CCDCTOKENID 			= "INSERT CCDC TOKEN ID";
const crowdFundAddress 			= 'INSERT CROWDFUND CASHADDRESS'; // address holding the BCH for distribution
const decodeTx 				= 'INSERT BLOCKPRESS DECODE: OPCODE + TX'
const smartContractMnemonic 		= 'INSERT CROWDFUND MNEMONIC';
var totalBCHForDistribution 		= 0.1; // total BCH for distribution in this airdrop
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

	// boolean outcome from cashscript method
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

		// 2nd iteration through array of CCDC holders to send alloted BCH
		for (var i = 0; i < ccdcAddrCount; i++) {
			var sendAmount = ccdcHolders[i].tokenBalance * distributionRate; // calculate the correct BCH to send
			console.log('\nSending ' + sendAmount + ' bch to ' + SLP.Address.toCashAddress(ccdcHolders[i].slpAddress));
			// sends the BCH (in sats) to the holder's cash address
			await sendBch(crowdFundAddress,
				SLP.Address.toCashAddress(ccdcHolders[i].slpAddress), 
				bitbox.BitcoinCash.toSatoshi(sendAmount)); 
		}

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
		//		it is not different than a local client side validation.
		var tx = await instance.functions.validateTokenID(localId, onchainId);//.send(instance.address,1000);
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
async function sendBch(sendAddress, receiveAddress, sendAmountSats) {
	
// Instantiate BITBOX based on the network.
const bitbox =
  network === `mainnet`
    ? new BITBOX({ restURL: `https://rest.bitcoin.com/v2/` })
    : new BITBOX({ restURL: `https://trest.bitcoin.com/v2/` })	

let RECV_ADDR = receiveAddress
const SATOSHIS_TO_SEND = sendAmountSats
const SEND_ADDR = sendAddress
const SEND_MNEMONIC = 'swim day tool hobby patrol omit wall age jungle lottery federal brother'

  try {
    
    const SEND_ADDR_LEGACY = bitbox.Address.toLegacyAddress(SEND_ADDR)
    const RECV_ADDR_LEGACY = bitbox.Address.toLegacyAddress(RECV_ADDR)

    const balance2 = await getBCHBalance(RECV_ADDR, false)

    const u = await bitbox.Address.utxo(SEND_ADDR)
    const utxo = findBiggestUtxo(u.utxos)

    const transactionBuilder = new bitbox.TransactionBuilder(network)

    const satoshisToSend = Math.floor(SATOSHIS_TO_SEND)
    const originalAmount = utxo.satoshis
    const vout = utxo.vout
    const txid = utxo.txid

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bitbox.BitcoinCash.getByteCount(
      { P2PKH: 1 },
      { P2PKH: 2 }
    )
    console.log(`byteCount: ${byteCount}`)
    const satoshisPerByte = 1.0
    const txFee = Math.floor(satoshisPerByte * byteCount)
    console.log(`txFee: ${txFee}`)

    // amount to send back to the sending address.
    // It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - satoshisToSend - txFee

    // add output w/ address and amount to send
    transactionBuilder.addOutput(RECV_ADDR, satoshisToSend)
    transactionBuilder.addOutput(SEND_ADDR, remainder)

    // Generate a change address from a Mnemonic of a private key.
    const change = changeAddrFromMnemonic(SEND_MNEMONIC)

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
    console.log(`TX hex: ${hex}`)
    console.log()

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
