const chalk = require('chalk')
const Stellar = require('stellar-sdk')
var StellarBase = require('stellar-base');
const config = require('../config.json');
const piLib = require('./piLib');
const prompt = require('prompt-sync')({ sigint: true });
const CLI = require('clui');
const Spinner = CLI.Spinner;

function makePayment() {

    piLib.createBanner('Make Payment');

    // --- START OF HARDCODED TRANSACTION DETAILS ---
    // You must replace these placeholder values with your actual information.
    // WARNING: Storing your private key here is a security risk.

    const accountAddress = "GB5MMCQZBMY3R75FKK5ZRGJVVHQNAPPM2ECPIWBKNX34BR6PCM5UINHN"; 
    const accountPassphrase = "million milk tortoise run salute humble task mix iron joy course rebuild warrior sample okay clip river local marine fame tag foot inherit fan"; 
    const destAccountAddress = "GD5HFY6T3RXWVICEFYEXIF7DVQOPAQPBPCNAZHZYWVT4JQGPVR5YWE6R";
    const assetName = ""; // Leave as "" for the native Pi currency
    const issuerAddress = ""; // Leave as "" for the native Pi currency
    const transferAmt = "10";
    const transferMemo = "";

    // --- END OF HARDCODED TRANSACTION DETAILS ---

    // The rest of the script remains the same
    
    // Validate the destination address
    if (!StellarBase.StrKey.isValidEd25519PublicKey(destAccountAddress)) {
        console.log(chalk.red('Not a valid destination address'))
        process.exit(1);
    }
    
    var transferAsset;
    if(assetName && issuerAddress) {
        transferAsset = new Stellar.Asset(assetName, issuerAddress);
    }else if ((assetName && !issuerAddress) || (!assetName && issuerAddress)) {
        throw "For sending assets, both asset name and issuer address must be set!"
    }else{
        transferAsset = Stellar.Asset.native();
    }
    
    const status = new Spinner('Making transaction, please wait...');
    status.start();

    const server = new Stellar.Server(config.server)

    const getKeyPair = (StellarBase.StrKey.isValidEd25519SecretSeed(accountPassphrase)) ? piLib.getKeyPairFromSecret : piLib.getKeyPairFromPassphrase;

    const fail = (message) => {
        console.log('\n')
        console.error(chalk.red(message))
        if (message.response && message.response.data && message.response.data.extras && message.response.data.extras.result_codes && message.response.data.extras.result_codes.operations) {
            const reason = message.response.data.extras.result_codes.operations;
            switch(reason) {
                case 'op_underfunded':
                    console.log(chalk.red('reason:', 'Sender account has insufficient funds'));
                    break;
                default:
                    console.log(chalk.red('reason:', reason))
            }
        }
        process.exit(1)
    }

    const success = (tn) => {
        status.stop();
        if (tn.successful){
            console.log(chalk.magentaBright(`\nTransaction succeeded! \nDestination: ${destAccountAddress}\nAmt: ${transferAmt}\nMemo: ${transferMemo}\nLink: ${tn._links.transaction.href}`))
        }else{
            console.log(chalk.red('\nTransaction Failed'))
        }
    }

    const transaction = async () => {

        const keypair = await getKeyPair(accountPassphrase)

        const paymentToDest = {
            destination: destAccountAddress,
            asset: transferAsset,
            amount: transferAmt,
        }
        const txOptions = {
            fee: await server.fetchBaseFee(),
            networkPassphrase: config.networkPassphrase,
        }
        const accountA = await server.loadAccount(accountAddress)
        const transaction = new Stellar.TransactionBuilder(accountA, txOptions)
            .addOperation(Stellar.Operation.payment(paymentToDest))
            .addMemo(Stellar.Memo.text(transferMemo))
            .setTimeout(StellarBase.TimeoutInfinite)
            .build()

        transaction.sign(keypair)

        const response = await server.submitTransaction(transaction)
        return response

    }
    
    transaction().then(success).catch(fail)

}

module.exports = makePayment;
