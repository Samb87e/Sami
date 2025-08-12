// A new file: ./src/autoPayment.js

const chalk = require('chalk');
const Stellar = require('stellar-sdk');
const prompt = require('prompt-sync')({ sigint: true });
const config = require('../config.json');
const piLib = require('./piLib');
const CLI = require('clui');
const Spinner = CLI.Spinner;

function autoPayment() {
    piLib.createBanner('Auto-Payment');
    
    console.log(chalk.red.bold('\nWARNING: This will attempt to send payments every millisecond. This is a very high frequency and may result in a large number of failed transactions and significant transaction fees. Use with caution.\n'));

    // Get user input for the transaction
    const sourcePassphrase = prompt(chalk.yellowBright('Source Account Passphrase/Private Key: '));
    const destinationAddress = prompt(chalk.yellowBright('Destination Account: '));
    const amount = prompt(chalk.yellowBright('Transfer Amount: '));

    // Handle the optional Asset. For this example, we will stick to native Pi.
    const asset = Stellar.Asset.native();
    const server = new Stellar.Server(config.server);
    const sourceKeys = Stellar.Keypair.fromSecret(sourcePassphrase);

    let paymentInterval;
    let paymentCount = 0;
    let paymentSpinner;

    async function sendPayment() {
        try {
            // Load the source account to get its sequence number
            const sourceAccount = await server.loadAccount(sourceKeys.publicKey());
            const transaction = new Stellar.TransactionBuilder(sourceAccount, {
                fee: '100', // Default fee
                networkPassphrase: config.networkPassphrase
            })
                .addOperation(Stellar.Operation.payment({
                    destination: destinationAddress,
                    asset: asset,
                    amount: amount
                }))
                .setTimeout(0) // Set a timeout of 0 for auto-payment
                .build();

            // Sign the transaction with the source account's keypair
            transaction.sign(sourceKeys);

            // Submit the transaction to the network
            const result = await server.submitTransaction(transaction);
            paymentCount++;
            paymentSpinner.message(chalk.greenBright(`Payments sent: ${paymentCount}. Last transaction ID: ${result.hash}`));

        } catch (e) {
            // Log the error but don't stop the interval
            paymentSpinner.message(chalk.redBright(`Payments sent: ${paymentCount}. Last payment failed. Reason: ${e.message}`));
        }
    }
    
    console.log(chalk.blueBright('\nStarting auto-payment process. Press Ctrl+C to stop.\n'));
    paymentSpinner = new Spinner(chalk.greenBright('Payments sent: 0'));
    paymentSpinner.start();
    
    // Set the interval to run the payment function every 1 millisecond
    paymentInterval = setInterval(sendPayment, 1);

    // Gracefully handle stopping the process with Ctrl+C
    process.on('SIGINT', () => {
        clearInterval(paymentInterval);
        paymentSpinner.stop();
        console.log(chalk.yellowBright('\nAuto-payment process stopped.'));
        process.exit();
    });
}

module.exports = autoPayment;
