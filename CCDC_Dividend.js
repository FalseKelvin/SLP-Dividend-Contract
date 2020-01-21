// ============== Initialisation Parameters ====================
const { BITBOX }			= require('bitbox-sdk');
const SLPSDK 				= require("../../slp-sdk/lib/SLP"); // amend depending on where your SLP SDK is stored
const { Contract, Sig, FailedRequireError } = require('cashscript');
const path 				= require('path');
const CCDCTOKENID 			= "INSERT CCDC TOKEN ID";
const crowdFundAddress 			= 'INSERT CROWDFUND CASHADDRESS'; // address holding the BCH for distribution
const decodeTx 				= 'OP_RETURN 653 6a028d024065633130613633613430363764666638356138626139323536646430633961383666323566396134313931623734313161353466356332666466643139323231';
const smartContractMnemonic 		= 'INSERT CROWDFUND MNEMONIC';
var totalBCHForDistribution 		= 1; // total BCH for distribution in this airdrop
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
	
}
  
  
module.exports = {
  run,
};
