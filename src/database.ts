import { Pool } from 'pg';
import {Collection, MongoClient} from 'mongodb';

export class BlockChainDatabase {
    // Connects to the blockchain holding MongoDB to query for stuff

    private db: any;
    private dburl: string;

    constructor(url: string) {
        this.dburl = url;
    }

    public connect(): Promise<{}> {
        return new Promise((resolve, reject) => {
            MongoClient.connect(this.dburl, (err, client) => {
                if(err) {
                    reject("Unable to connect to mongo db: " + err);
                }

                this.db = client.db("voting");

            });
        })
    }

    private getContractsForSender(txsenders: string[]): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
           const mcBlocks: Collection<any> = this.db.collection("blocks");
           mcBlocks.aggregate([
               {
                   $match: {
                       "txs.sender": { $in: txsenders }
                   }
               },
               { $unwind: { path : "$txs" }},
               {
                   $match: {
                       "txs.sender": { $in: txsenders },
                       "txs.receipt.contract": { $ne: "" }
                   }
               },
               {
                   $group: {
                       _id: 1,
                       contracts: { $addToSet: "$txs.receipt.contract" }
                   }
               }
           ], (err, cursor) => {
               if(err) {
                   reject("Unable to run pipeline:" + err);
               }

               cursor.toArray((err, docs) => {
                   if(err) {
                       reject("Unable to get results: " + err);
                   }

                   if(docs.length > 0) {
                       resolve(docs[0].contracts);
                   } else {
                       resolve([]);
                   }
               })
           });
        });
    }

    public getDeveloperGasForAddresses(txsenders: string[]): Promise<number> {
        return new Promise<number>((resolve, reject) => {
           this.getContractsForSender(txsenders).then((contracts: string[]) => {
               const mcBlocks: Collection<any> = this.db.collection("blocks");
               mcBlocks.aggregate();

            });
        });
    }

    public getGasSumForAddresses(txsenders: string[]): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {"txs.sender": { $in: txsenders}}
                },
                { $unwind: { path : "$txs" }},
                {
                    $match: {"txs.sender": { $in: txsenders}}
                },
                {
                    $project: {
                        sender: "$txs.sender",
                        gas: "$txs.receipt.gasused"
                    }
                },
                {
                    $group: {
                        _id: "1",
                        gasTotal: { $sum: "$gas"}
                    }
                }
            ],(err, cursor) => {
                if(err) {
                    reject("Unable to run pipeline:" + err);
                }
                cursor.toArray((err, documents) => {
                    if(err) {
                        reject("Unable to process result:" + err);
                    }
                    if(documents.length > 0) {
                        resolve(documents[0].gasTotal);
                    } else {
                        resolve(0);
                    }

                });
            });
        });
    }

    public getDifficultySumForMiners(miners: string[]): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {"miner": { $in: miners}}
                },
                {
                    $project: {
                        miner: 1,
                        dif: 1
                    }
                },
                {
                    $group: {
                        _id: "1",
                        totalDifficulty: { $sum: "$dif"}
                    }
                }
            ],(err, cursor) => {
                if(err) {
                    reject("Unable to run pipeline:" + err);
                }
                cursor.toArray((err, documents) => {
                    if(err) {
                        reject("Unable to process result:" + err);
                    }
                    if(documents.length > 0) {
                        resolve(documents[0].totalDifficulty);
                    } else {
                        resolve(0);
                    }

                });
            });
        });
    }

    public getGasSumForAddress(txsender: string): Promise<number> {
        return this.getGasSumForAddresses([txsender]);
    }

}

export default class Database {

    private dbPool: Pool;
    private mongoUrl: string;

    constructor(host: string, user: string, password: string, dbname: string, port: number = 5432) {
        // Prepare PGSQL connection pool
        this.mongoUrl = "mongodb://10.142.1.14";
        this.dbPool = new Pool({
            user: user,
            host: host,
            database: dbname,
            password: password,
            port: port
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
        const mongo = new BlockChainDatabase(this.mongoUrl);
        return mongo.getGasSumForAddress(address);
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
        const mongo = new BlockChainDatabase(this.mongoUrl);
        return mongo.getGasSumForAddresses(addresses);
    }

    public async getTotalDifficultyForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl);
        return mongo.getDifficultySumForMiners(addresses);
    }

    public async getTotalContractGasForProposal(pollId: number, proposalId: number) : Promise<number> {
        // TODO: improve that statement
        const qry: string = "; WITH i AS (SELECT DISTINCT trace.tx_hash, trace.trace_position, trace.gas_used, transactions.tx_sender FROM transactions INNER JOIN trace ON trace.send_to = transactions.creates INNER JOIN votes ON transactions.tx_sender = votes.address AND votes.voted_for_proposal = $1 AND votes.poll_id = $2) SELECT SUM(b.gas_used) - SUM(a.gas_used) FROM (SELECT SUM(trace.gas_used) AS gas_used, trace.tx_hash AS tx_hash FROM i INNER JOIN trace ON i.tx_hash = trace.tx_hash AND i.trace_position = trace.parent_trace_position GROUP BY trace.tx_hash ) AS a INNER JOIN i AS b ON a.tx_hash = b.tx_hash";

        try {
            const dbResultRows = await this.dbPool.query(qry,[proposalId, pollId]);
            if(dbResultRows.rowCount > 0) {
                return parseInt(dbResultRows.rows[0].i);
            } else {
                return 0;
            }
        } catch (err) {
            throw "Unable to query database: " + err;
        }
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