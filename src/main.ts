/* Blockchain Voting -- Backend */
const Sentry = require('@sentry/node');
import fs from 'fs';
import {IDatabaseOptions } from './database';
import {BackendServer, IServerConfiguration} from "./server";
import winston from 'winston';
import { preAggregate } from './pre-aggregate';

Sentry.init({
    dsn: 'https://6edc8b7d9dc444f1b1e75683e2b07fe2@sentry.slock.it/6',
    environment: process.env.TARGET || 'local',
    release: "voting-backend@" + (process.env.VERSION || 'v0.0.0')
});

const Web3 = require('web3');

//Get configuration from environment
const mongourl: string = process.env.MONGO_URL || 'mongodb://10.142.1.25:27017';
const mongoname: string = process.env.MONGO_NAME|| 'voting';
const rootPath: string = process.env.ROOT_PATH || '';
const contractAddress: string = process.env.CONTRACT_ADDR || '0x096DA8ED2eaFd6945b325DfD515315CBeB36F6d3';
const srvPort: number = parseInt(process.env.PORT ? process.env.PORT : '9999') || 9999;
const parityRpc: string = process.env.RPC_URL || 'https://rpc.slock.it/mainnet';

// Build config objects
const dbOpts: IDatabaseOptions = {
    mongoDbName: mongoname,
    mongoUrl:mongourl
};

const serverConfig: IServerConfiguration = {
    listenPort: srvPort,
    contractAddress: contractAddress,
    dbOptions: dbOpts,
    parityRpc: parityRpc,
    basePath: rootPath
};

// Setup winston
const logger: winston.Logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.Console({handleExceptions:true})
      ],  
      exitOnError: false, // <--- set this to false
});

// Load contract from file
const web3 = new Web3(parityRpc);
const contract = JSON.parse(fs.readFileSync('./data/poll-contract.json').toString());
const pollContract = new web3.eth.Contract(contract, contractAddress);

// Instantiate and fire up server
const srv = new BackendServer(serverConfig,logger,pollContract);
srv.startListening();

function agg() {
    setTimeout(() => {
        preAggregate(logger);
        agg();
    },60000)
}

agg();