import {Pool} from 'pg';
import {BlockChainDatabase} from "./blockChainDatabase";
import winston from "winston";

export interface IDatabaseOptions {
    sqlHost:string;
    sqlDatabaseName:string;
    sqlUser:string;
    sqlPassword:string;
    sqlPort:number;
    mongoUrl: string;
    mongoDbName: string;

}

export default class Database {

    private dbPool: Pool;
    private mongoUrl: string;
    private mongoName: string;

    constructor(opts: IDatabaseOptions) {
        // Prepare PGSQL connection pool
        this.mongoUrl = opts.mongoUrl;
        this.mongoName = opts.mongoDbName;
        this.dbPool = new Pool({
            user: opts.sqlUser,
            host: opts.sqlHost,
            database: opts.sqlDatabaseName,
            password: opts.sqlPassword,
            port: opts.sqlPort
        });
    }

    public async getAllVotes() : Promise<Vote[]> {
        const resultVotes: Vote[] = [];
        try {
            const qry: string = "SELECT id, poll_id, voted_for_proposal, timestamp, address, message FROM votes";
            const dbResultRows = await this.dbPool.query(qry);

            dbResultRows.rows.forEach(row => {
                 resultVotes.push({
                     voteId: row.id,
                     pollId: row.poll_id,
                     proposalId: row.voted_for_proposal,
                     timestamp: row.timestamp,
                     voterAddress: row.address,
                     message: row.message,
                     isValid: true
                 });
            });

        }
        catch(err) {
            throw "unable to query DB:"  + err;
        }
        return resultVotes;
    }

    public async getVotesForPoll(pollId: number) : Promise<Vote[]> {
        const resultVotes: Vote[] = [];
        try {
            const qry: string = "SELECT id, voted_for_proposal, timestamp, address, message FROM votes WHERE poll_id = $1";
            const dbResultRows = await this.dbPool.query(qry,[pollId]);

            dbResultRows.rows.forEach(row => {
                resultVotes.push({
                    voteId: row.id,
                    pollId: pollId,
                    proposalId: row.voted_for_proposal,
                    timestamp: row.timestamp,
                    voterAddress: row.address,
                    message: row.message,
                    isValid: true
                });
            });

        }
        catch(err) {
            throw "unable to query DB:"  + err;
        }
        return resultVotes;
    }

    public async getGasSumForAddress(address: string) : Promise<number> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoName);
        return mongo.connect().then(() => {
            return mongo.getGasSumForAddress(address);
        });
    }

    public async checkVoteExists(pollId: number, address: string) :Promise<boolean> {
        const qry: string = "SELECT count(poll_id) as ct FROM votes WHERE address = $1 AND poll_id = $2";
        try {
            const dbResultRows = await this.dbPool.query(qry,[address.toLowerCase(),pollId]);
            return dbResultRows.rows[0].ct > 0;
        } catch(err) {
            throw "Unable to query database: " + err;
        }
    }

    public async createVote(pollId: number, proposalId: number, address: string, message: string) : Promise<void> {
        const qry: string = "INSERT INTO votes (poll_id, voted_for_proposal, address, message) VALUES ($1,$2, $3, $4)";
        try {
            await this.dbPool.query(qry,[pollId,proposalId,address.toLowerCase(),message]);
        } catch(err) {
            throw "Unable to query database: " + err;
        }
    }

    public async updateVote(pollId: number, proposalId: number, address: string, message: string, isValidVote: boolean) : Promise<void> {
        const qry: string = "UPDATE votes SET voted_for_proposal = $1, message = $2 WHERE poll_id = $3 AND address = $4";
        try {
            await this.dbPool.query(qry,[proposalId,message,pollId,address.toLowerCase()])
        } catch(err) {
            throw "Unable to query database: " + err;
        }
    }

    public async getTotalTrxGasForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoName);
        return mongo.connect().then(() => {
            return mongo.getGasSumForAddresses(addresses);
        });
    }

    public async getTotalDifficultyForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoName);
        return mongo.connect().then(() => {
            return mongo.getDifficultySumForMiners(addresses);
        });
    }

    public async getTotalContractGasForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoName);
        return mongo.connect().then(() => {
            return mongo.getDeveloperGasForAddresses(addresses);
        });
    }

    public async getAddressesForProposal(pollId: number, proposalId: number) : Promise<string[]> {
        const addresses: string[] = [];
        const qry: string = 'SELECT address FROM votes WHERE poll_id = $1 AND voted_for_proposal = $2';
        try {
            const dbResultRows = await this.dbPool.query(qry,[pollId,proposalId]);
            dbResultRows.rows.forEach(row => {
                 addresses.push(row.address);
            });

        } catch (err) {
            throw "Unable to query database: " + err;
        }
        return addresses;
    }

}

export interface Vote {
    voteId: number,
    pollId: number,
    proposalId: number,
    timestamp: Date,
    voterAddress: string,
    message: string,
    isValid: boolean
}