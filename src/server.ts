/* Blockchain Voting -- Backend */
import {PollDto, ProposalDto} from "./dtos";
const BN = require('bn.js');
const Web3 = require('web3');

import Database, {IDatabaseOptions, Vote} from './database';
import express, {Express, Request, Response, Router} from 'express';
import bodyParser from 'body-parser';
import winston from 'winston';
const expressWinston = require('express-winston');

export interface IServerConfiguration {
    parityRpc: string;
    basePath: string,
    contractAddress:string,
    listenPort: number,
    dbOptions: IDatabaseOptions
}

export class BackendServer {
    private app: Express;
    private logger: winston.Logger;
    private contract: any;
    private web3: any;
    private config: IServerConfiguration;
    private db: Database;

    constructor(config: IServerConfiguration, logger: winston.Logger, contract: any) {
        this.app = express();
        this.logger= logger;
        this.contract = contract;
        this.config = config;

        //prepare server
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        this.app.use(bodyParser.json());
        

        const router = this.setupRouter();
        this.app.use(this.config.basePath + '/api', router);

        this.app.use(expressWinston.logger({
            winstonInstance: logger,
            meta: true, // optional: control whether you want to log the meta data about the request (default to true)
            colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
        }));
        //Init DB
        this.db = new Database(this.config.dbOptions);
        this.web3 = new Web3(this.config.parityRpc);

    }

    public startListening() {
        const httpServer = this.app.listen(this.config.listenPort);
        this.logger.log('info', 'Blockchain Backend running on port ' + this.config.listenPort);
        this.logger.log('info', 'Basepath: ' + this.config.basePath + '/api');
        return httpServer;
    }

    public stop() {
        this.db.close();
    }

    private static error(msg: string): string {
        return JSON.stringify({status: "error", message: msg});
    }

    private setupRouter(): Router {
        const router: Router = Router();

        // Setup middleware
        router.use(async (req: Request, res: Response, next) => {
            //allow cross site scripting
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        // Map paths
        router.get('/', this.getGreeting);      // send a greeting
        router.get('/poll', this.getPolls);     // delivers a list of all polls (blockchain request)
        router.get('/poll/:PollId', this.getPollById); //delivers poll with given poll id (blockchain request)
        router.get('/proposal/:ProposalId', this.getProposalById); //return proposal by id (blockchain request)
        router.route('/votes')
            .get(this.getAllVotes)
            .post(this.createOrUpdateVote);

        router.get('/votes/:PollId',this.getVoteByPollId);
        router.get('/votes/gas/:PollId/:ProposalId',this.getGasForProposal);
        router.get('/votes/miner/:PollId/:ProposalId',this.getDifficultyForProposal);
        router.get('/votes/dev/:PollId/:ProposalId',this.getContractGasForProposal);

        return router;
    }

    private getGreeting = (req: Request, res: Response) => {
        res.json({
            message: 'Blockchain voting for the win!'
        });
    };

    private getPolls = async (req: Request, res: Response) => {
        const resultPolls: PollDto[] = [];

        try {
            const amountOfPolls: number = await this.contract.methods.getPollAmount().call();

            for (let i = 0; i < amountOfPolls; i++) {
                let pollObject = await this.contract.methods.polls(i).call();
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
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Blockchain Error'));
            return;
        }

        res.json(resultPolls);
    };

    private getPollById = async (req: Request, res: Response) => {
        // TODO: check that pollid is actually an integer
        const resultPolls: PollDto[] = [];
        try {
            const poll = await this.contract.methods.polls(req.params.PollId).call();
            resultPolls.push({
                author: poll.author,
                allowProposalUpdate: poll.allowProposalUpdate,
                startDate: poll.startDate,
                endDate: poll.endDate,
                votingChoice: poll.votingChoice
            });
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error("Blockchain Error"));
            return;
        }
        res.json(resultPolls)
    };

    private getProposalById = async (req: Request, res: Response) => {
        const resultProposals: ProposalDto[] = [];
        try {
            const proposal = await this.contract.methods.proposals(req.params.ProposalId).call();

            //parse the object returned from the contract to adapt to our needs
            resultProposals.push({
                name: proposal.name,
                description: proposal.description,
                author: proposal.author,
                pollId: proposal.pollId
            });
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error("Blockchain Error"));
            return;
        }

        res.json(resultProposals)
    };

    private getAllVotes = async (req: Request, res: Response) => {
        let dbVotes: Vote[] = [];
        try {
            // TODO: dbVotes should be mapped through a DTO
            dbVotes = await this.db.getAllVotes();
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Database Error'));
            return;
        }
        res.json(dbVotes);
    };

    private createOrUpdateVote = async (req: Request, res: Response) => {
        //const payload = JSON.parse(req.body);
        const messageObject = JSON.parse(req.body.data.message);
        //check for validity of the message
        const poll_id = messageObject.poll_id;
        const proposal_id = messageObject.proposal_id;
        const contract_address = messageObject.pollContractAddress;

        //check if the contract in the passed message is supported by slockit
        if (contract_address.localeCompare(this.config.contractAddress) != 0) {
            res.status(400).send(BackendServer.error("Unsupported Contract!"));
            this.logger.log('error', "Unsupported contract");
            return;
        }

        //get the address from the signature
        let address: string = '';
        try {
            address = await this.web3.eth.accounts.recover(req.body.data.message, req.body.data.signature)
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('unable to process signature'));
            return;
        }

        //delete 0x (for database use)
        const addressNox: string = address.substring(2);

        try {
            const gasSumForAddress: number = await this.db.getGasSumForAddress(addressNox);

            if (gasSumForAddress === -1) {
                res.status(400).send(BackendServer.error("Unused Addresses are not supported!"));
                this.logger.log('warning', "Unused Addresses are not supported!");
                return;
            }

        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Database Error'));
            return;
        }

        const voteExists = await this.db.checkVoteExists(poll_id, addressNox);

        //if no entry for that poll from this address then insert
        if (!voteExists) {
            try {
                await this.db.createVote(poll_id, proposal_id, addressNox, JSON.stringify(req.body.data));
                res.json({
                    message: "success - vote taken",
                    successfullyVoted: true
                });
            } catch (err) {
                this.logger.log('error', "Unable to check vote", err);
                res.status(500).send(BackendServer.error('Database error'));
                return;
            }
        } else {
            //check contract on how the poll is supposed to react if the address already voted
            let pollObject = await this.contract.methods.polls(poll_id).call();

            if (pollObject.votingChoice == 0) {// useNewestVote
                try {
                    await this.db.updateVote(poll_id, proposal_id, addressNox, JSON.stringify(req.body.data), true);
                    res.json({
                        message: "success - New vote has been noted",
                        successfullyVoted: true
                    });
                } catch (err) {
                    this.logger.log('error', err);
                    res.status(500).send(BackendServer.error('Database Error - Error Updating your Vote!'));
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
                    await this.db.updateVote(poll_id, proposal_id, addressNox, JSON.stringify(newVoteState), false);

                    res.json({
                        message: "success - This poll does not allow double voting, your vote was nullified",
                        successfullyVoted: false
                    });

                } catch (err) {
                    this.logger.log('error', "Unable to update vote", err);
                    res.status(500).send(BackendServer.error('Database Error - Error Updating your Vote!'));
                    return;
                }
            } else {
                res.json({
                    status: 'error',
                    message: "contract voting behaviour not supported",
                    successfullyVoted: false
                })
            }
        }
    };

    private getVoteByPollId = async (req: Request, res: Response) => {
        // TODO: verify that pollid is integer
        const pollId = parseInt(req.params.PollId);
        try {
            const votes: Vote[] = await this.db.getVotesForPoll(pollId);
            res.json(votes);
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Database Error - Error Selecting!'));
            return;
        }
    };

    private getGasForProposal = async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);
        let accumulatedGas: number = 0;
        try {
            accumulatedGas = await this.db.getTotalTrxGasForProposal(pollId, proposalId);
        } catch (err) {
            this.logger.log('error', err);

            res.status(500).send(BackendServer.error('Database Error - Error Selecting!'));
            return;
        }

        let addresses: string[] = [];
        try {
            addresses = await this.db.getAddressesForProposal(pollId, proposalId);
        } catch (err) {
            this.logger.log('error', err);

            res.status(500).send(BackendServer.error('Database Error - Error Selecting!'));
            return;
        }

        let sum = new BN(0);
        for (const addr of addresses) {
            const biggy = new BN(await this.web3.eth.getBalance("0x" + addr));
            sum = sum.add(biggy);
        }

        res.json({
            gas_sum: accumulatedGas,
            coin_sum: sum.toString()
        });

    };

    private getDifficultyForProposal = async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);

        let totalDifficulty: number = 0;
        try {
            totalDifficulty = await this.db.getTotalDifficultyForProposal(pollId, proposalId);
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Database Error - Error Selecting!'));
            return;
        }

        res.json({
            gas_sum: totalDifficulty
        });
    };

    private getContractGasForProposal = async (req: Request, res: Response) => {

        // TODO: check that pollid & proposalid are integer
        const pollId = parseInt(req.params.PollId);
        const proposalId = parseInt(req.params.ProposalId);

        let accumulatedGas: number = 0;
        try {
            accumulatedGas = await this.db.getTotalContractGasForProposal(pollId, proposalId);
        } catch (err) {
            this.logger.log('error', err);
            res.status(500).send(BackendServer.error('Database Error - Error Selecting!'));
            return;
        }

        res.json({
            gas_sum: accumulatedGas
        })

    }
}
