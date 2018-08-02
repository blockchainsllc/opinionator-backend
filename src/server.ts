/* Blockchain Voting -- Backend */
import {PollDto, ProposalDto} from "./dtos";
import fs from 'fs';
import Database, {IDatabaseOptions, Vote} from './database';
import express, {Request, Response, Router} from 'express';
import bodyParser from 'body-parser';
import winston from 'winston';
const expressWinston = require('express-winston');

const Web3 = require('web3');
const BN = require('bn.js');

/***************
 * CONFIGURATION
 ***************/

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

//Setup winston
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


//Prepare DB and blockchain connection
const dbOpts: IDatabaseOptions = {
    sqlPort: 5432,
    sqlPassword: dbpw,
    sqlDatabaseName: dbname,
    sqlUser: dbuser,
    sqlHost: dbhost,
    mongoDbName: mongoname,
    mongoUrl:mongourl
}
const db = new Database(dbOpts);
const web3 = new Web3(parityRpc);

//Load contract from file
const contract = JSON.parse(fs.readFileSync('./data/poll-contract.json').toString());
const pollContract = new web3.eth.Contract(contract, contractAddress);

// Prepare HTTP API
const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(expressWinston.logger({
    winstonInstance: logger,
    meta: true, // optional: control whether you want to log the meta data about the request (default to true)
    colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
}));

//ROUTES FOR API
// =================================


//delete LOWER and make lower beforehand

function error(msg: string) : string {
    return JSON.stringify({status:"error",message:msg});
}


const router: Router = Router();

//middleware
router.use(async (req: Request, res: Response, next) => {
    //allow cross site scripting
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        next();
    } catch (err) {
        logger.log('error', err);
        res.status(500).send("Oops, something went wrong!");
    }
});

//standart route
router.get( '/', (req: Request, res: Response) => {
    res.json({
        message: 'Blockchain voting for the win!'
    });
});

router.route('/poll')
    //delivers a list of all polls (blockchain request)
    .get(async (req: Request, res: Response) => {
        const resultPolls: PollDto[] = [];

        try {
            const amountOfPolls: number = await pollContract.methods.getPollAmount().call();

            for (let i = 0; i < amountOfPolls; i++) {
                let pollObject = await pollContract.methods.polls(i).call();
                //parse the object returned from the contract to adapt to our needs
                resultPolls.push({
                    author: pollObject.author,
                    allowProposalUpdate: pollObject.allowProposalUpdate,
                    startDate: pollObject.startDate,
                    endDate: pollObject.endDate,
                    votingChoice: pollObject.votingChoice
                });
            }
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error('Blockchain Error'));
            return;
        }

        res.json(resultPolls);
    });

router.route('/poll/:PollId')
    //delivers poll with given poll id (blockchain request)
    .get(async (req: Request, res: Response) => {

        // TODO: check that pollid is actually an integer

        const resultPolls: PollDto[] = [];
        try {
            const poll = await pollContract.methods.polls(req.params.PollId).call();
            resultPolls.push({
                author: poll.author,
                allowProposalUpdate: poll.allowProposalUpdate,
                startDate: poll.startDate,
                endDate: poll.endDate,
                votingChoice: poll.votingChoice
            });
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error("Blockchain Error"));
            return;
        }

        res.json(resultPolls)
    });

router.route('/proposal/:ProposalId')
    //return proposal by id (blockchain request)
    .get(async (req: Request, res: Response) => {
        const resultProposals: ProposalDto[] = [];
        try {
            const proposal = await pollContract.methods.proposals(req.params.ProposalId).call();

            //parse the object returned from the contract to adapt to our needs
            resultProposals.push({
                name: proposal.name,
                description: proposal.description,
                author: proposal.author,
                pollId: proposal.pollId
            });
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error("Blockchain Error"));
            return;
        }

        res.json(resultProposals)
    });

router.route('/votes')
//delivers all votes given (database request)
//@developer should be considerd to be turned of to avoid to much data being send (limit to poll)
    .get(async (req: Request, res: Response) => {
        let dbVotes: Vote[] = [];
        try {
            // TODO: dbVotes should be mapped through a DTO
            dbVotes = await db.getAllVotes();
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error('Database Error'));
            return;
        }
        res.json(dbVotes);
    })

    //stores a vote passed with the post
    .post(async (req: Request, res: Response) => {
        //const payload = JSON.parse(req.body);
        const messageObject = JSON.parse(req.body.data.message);
        //check for validity of the message
        const poll_id = messageObject.poll_id;
        const proposal_id = messageObject.proposal_id;
        const contract_address = messageObject.pollContractAddress;

        //check if the contract in the passed message is supported by slockit
        if (contract_address.localeCompare(contractAddress) != 0) {
            res.status(400).send(error("Unsupported Contract!"));
            logger.log('error', "Unsupported contract");
            return;
        }

        //get the address from the signature
        let address: string = '';
        try {
            address = await web3.eth.accounts.recover(req.body.data.message, req.body.data.signature)
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error('Invalid message format!'));
            return;
        }

        //delete 0x (for database use)
        const addressNox: string = address.substring(2);

        try {
            const gasSumForAddress: number = await db.getGasSumForAddress(addressNox);

            if(gasSumForAddress === -1) {
                res.status(400).send(error("Unused Addresses are not supported!"));
                logger.log('warning', "Unused Addresses are not supported!");
                return;
            }

        } catch(err) {
            logger.log('error', err);
            res.status(500).send(error('Database Error'));
            return;
        }

        const voteExists = await db.checkVoteExists(poll_id,addressNox);

        //if no entry for that poll from this address then insert
        if (!voteExists) {
            try {
                await db.createVote(poll_id,proposal_id,addressNox,JSON.stringify(req.body.data));
                res.json({
                    message: "success - vote taken",
                    successfullyVoted: true
                });
            } catch (err) {
                logger.log('error', "Unable to check vote", err);
                res.status(500).send(error('Database error'));
                return;
            }
        } else {
            //check contract on how the poll is supposed to react if the address already voted
            let pollObject = await pollContract.methods.polls(poll_id).call();

            if (pollObject.votingChoice == 0) {// useNewestVote
                try {
                    await db.updateVote(poll_id,proposal_id,addressNox,JSON.stringify(req.body.data),true);
                    res.json({
                        message: "success - New vote has been noted",
                        successfullyVoted: true
                    });
                } catch (err) {
                    logger.log('error', err);
                    res.status(500).send(error('Database Error - Error Updating your Vote!'));
                    return;
                }
            } else if (pollObject.votingChoice == 1) {// useOldestVote
                res.json({
                    message: "success - This poll does not allow new votes",
                    successfullyVoted: false
                });
            } else if (pollObject.votingChoice == 2) {// nullifyAllOnDoubleVote
                try {
                    const newVoteState = {
                        banned: 'for double voting'
                    };
                    await db.updateVote(poll_id,proposal_id,addressNox,JSON.stringify(newVoteState),false);

                    res.json({
                        message: "success - This poll does not allow double voting, your vote was nullified",
                        successfullyVoted: false
                    });

                } catch (err) {
                    logger.log('error',"Unable to update vote",err);
                    res.status(500).send(error('Database Error - Error Updating your Vote!'));
                    return;
                }
            } else {
                res.json({
                    status:'error',
                    message: "contract voting behaviour not supported",
                    successfullyVoted: false
                })
            }
        }
    });

router.route('/Votes/:PollId')
//delivers all polls for the poll with given id
    .get(async (req: Request, res: Response) => {

        // TODO: verify that pollid is integer
        try {
            const votes: Vote[] = await db.getVotesForPoll(req.params.PollId);
            res.json(votes);
        } catch (err) {
            logger.log('error', err);

            res.status(500).send(error('Database Error - Error Selecting!'));
            return;
        }
    });

router.route('/votes/gas/:PollId/:ProposalId')
//delivers the accumulated gas of all addresses that voted on specified proposal and the accumulated coin value of same proposal
    .get(async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);
        let accumulatedGas: number = 0;
        try {
            accumulatedGas = await db.getTotalTrxGasForProposal(pollId, proposalId);
        } catch (err) {
            logger.log('error', err);

            res.status(500).send(error('Database Error - Error Selecting!'));
            return;
        }

        let addresses: string[] = [];
        try {
            addresses = await db.getAddressesForProposal(pollId, proposalId);
        } catch (err) {
            logger.log('error', err);

            res.status(500).send(error('Database Error - Error Selecting!'));
            return;
        }

        let sum = new BN(0);
        for(const addr of addresses) {
            const biggy = new BN(await web3.eth.getBalance("0x" + addr));
            sum = sum.add(biggy);
        }        

        res.json({
            gas_sum: accumulatedGas,
            coin_sum: sum.toString()
        });

    });

router.route('/Votes/Miner/:PollId/:ProposalId')
//delivers the accumulated difficulty solved of all miners that voted on specified proposal and the accumulated coin value of same proposal
    .get(async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);

        let totalDifficulty: number = 0;
        try {
            totalDifficulty = await db.getTotalDifficultyForProposal(pollId, proposalId);
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error('Database Error - Error Selecting!'));
            return;
        }

        res.json({
            gas_sum: totalDifficulty
        });
    });


router.route('/Votes/Dev/:PollId/:ProposalId')
//delivers the accumulated gas usage of all contracts and assigns it to the deployer address
//@devel could be done in one statement if someone can figure it out ;)
    .get(async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);

        let accumulatedGas: number = 0;
        try {
            accumulatedGas = await db.getTotalContractGasForProposal(pollId, proposalId);
        } catch (err) {
            logger.log('error', err);
            res.status(500).send(error('Database Error - Error Selecting!'));
            return;
        }

        res.json({
            gas_sum: accumulatedGas
        })

    });

//REGISTER ROUTES
// =================================

app.use(rootPath+ '/api', router);

//START THE SERVER
// =================================

const httpServer = app.listen(srvPort);
logger.log('info','Blockchain Backend running on port ' + srvPort);
logger.log('info','Basepath: ' + rootPath+ '/api');
module.exports = httpServer;
