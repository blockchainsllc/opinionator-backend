/* Blockchain Voting -- Backend */
import fs from 'fs';
import {IDatabaseOptions } from './database';
import {BackendServer, IServerConfiguration} from "./server";
import winston from 'winston';
const Web3 = require('web3');

//Get configuration from environment
const dbhost: string = process.env.PG_HOST || '10.142.1.12';
const dbname: string = process.env.PG_NAME || 'voting_tobalaba';
const dbuser: string = process.env.PG_USER || 'user_voting';
const dbpw: string = process.env.PG_PASSWORD || 'sl0ck1tvoting';
const mongourl: string = process.env.MONGO_URL || 'mongodb://10.142.1.14:27017';
const mongoname: string = process.env.MONGO_NAME|| 'voting_tobalaba';
const rootPath: string = process.env.ROOT_PATH || '';
const contractAddress: string = process.env.CONTRACT_ADDR || '0x096DA8ED2eaFd6945b325DfD515315CBeB36F6d3';
const srvPort: number = parseInt(process.env.PORT ? process.env.PORT : '9999') || 9999;
const parityRpc: string = process.env.RPC_URL || 'https://rpc.slock.it/tobalaba';

// Build config objects
const dbOpts: IDatabaseOptions = {
    sqlPort: 5432,
    sqlPassword: dbpw,
    sqlDatabaseName: dbname,
    sqlUser: dbuser,
    sqlHost: dbhost,
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
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'test') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Load contract from file
const web3 = new Web3(parityRpc);
const contract = JSON.parse(fs.readFileSync('./data/poll-contract.json').toString());
const pollContract = new web3.eth.Contract(contract, contractAddress);

// Instantiate and fire up server
const srv = new BackendServer(serverConfig,logger,pollContract);
srv.startListening();