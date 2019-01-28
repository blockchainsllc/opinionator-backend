import {Collection, MongoClient} from "mongodb";

export class BlockChainDatabase {
    // Connects to the blockchain holding MongoDB to query for stuff

    private db: any;
    private dburl: string;
    private dbName: string;
    private client: any;

    constructor(url: string, dbname: string) {
        this.dburl = url;
        this.dbName = dbname;
    }

    public connect(): Promise<{}> {
        return new Promise((resolve, reject) => {
            MongoClient.connect(this.dburl,{ useNewUrlParser: true }, (err, client) => {
                if (err) {
                    reject("Unable to connect to mongo db: " + err);
                }

                this.client = client;
                this.db = client.db(this.dbName);
                resolve();

            });
        })
    }

    public close(): Promise<{}> {
        return new Promise<{}>((res) => {
            this.client.close(() => {
                res();
            });
        })
    }

    public updateVote(pollId: number, proposalId: number, address: string, message: string): Promise<{}> {
        return new Promise((resolve,reject) => {
            const mcVotes: Collection<any> = this.db.collection("votes");
            mcVotes.updateOne({
                address: address,
                pollid: pollId
            },{
                votedForProposal: proposalId,
                msg: message
            },(err,res) => {
                if(err) {
                    reject("Unable to update vote");
                } else {
                    resolve();
                }
            })
        });
    }

    public createVote(pollId: number, proposalId: number, address: string, message: string): Promise<{}> {
        return new Promise((resolve,reject) => {
            const mcVotes: Collection<any> = this.db.collection("votes");
            mcVotes.insertOne({
                address: address,
                pollid: pollId,
                votedForProposal: proposalId,
                msg: message,
                timestamp: Date.now()
            },(err,res) => {
                if(err) {
                    reject("Unable to insert vote");
                } else {
                    resolve();
                }
            })
        });
    }

    public getVotes(pollId: number): Promise<any[]> {
        return new Promise((resolve,reject) => {
            const mcVotes: Collection<any> = this.db.collection("votes");
            mcVotes.find(pollId === -1 ? {} : {
                pollid: pollId
            }).toArray((err, docs) => {

                if (err) {
                    reject("Unable to get results: " + err);
                }

                if (docs.length > 0) {
                    resolve(docs.map((d,idx) => {
                        return {
                            voteId: idx,
                            pollId: d.pollid,
                            proposalId: d.votedForProposal,
                            timestamp: d.timestamp,
                            voterAddress: d.address,
                            message: d.msg,
                            isValid: true
                        };
                    }));
                } else {
                    resolve([]);
                }

            });
        });
    }

    public checkIfVoteExist(pollId: number, address: string): Promise<number> {
        return new Promise((resolve,reject) => {
            const mcVotes: Collection<any> = this.db.collection("votes");
            mcVotes.aggregate([
                {
                    $match: {
                        "address": address,
                        "pollid": pollId
                    }
                },
                {
                    $group: {
                        _id: 1,
                        ct: {$sum:1}
                    }
                }
            ],(err, cursor) => {
                if (err) {
                    reject("Unable to run pipeline:" + err);
                }

                cursor.toArray((err, docs) => {
                    if (err) {
                        reject("Unable to get results: " + err);
                    }

                    if (docs.length > 0) {
                        resolve(docs[0].ct);
                    } else {
                        resolve(0);
                    }
                })
            });
        });
    }

    public getAddressForProposal(pollId: number, proposalId: number): Promise<string[]> {
        return new Promise((resolve,reject) => {
            const mcVotes: Collection<any> = this.db.collection("votes");
            mcVotes.aggregate([
                {
                    $match: {
                        "votedForProposal": proposalId.toString(),
                        "pollid": pollId
                    }
                },
                {
                    $group: {
                        _id: "$address",
                        ct: {$sum:1}
                    }
                }
            ],(err, cursor) => {
                if (err) {
                    reject("Unable to run pipeline:" + err);
                }

                cursor.toArray((err, docs) => {
                    if (err) {
                        reject("Unable to get results: " + err);
                    }

                    if (docs.length > 0) {
                        resolve(docs.map(d => d._id));
                    } else {
                        resolve([]);
                    }
                })
            });
        });
    }


    private getContractsForSender(txsenders: string[]): Promise<string[]> {
        const lcSenders =  txsenders.map(x => x.toLowerCase());
        return new Promise<string[]>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {
                        "txs.sender": {$in: lcSenders}
                    }
                },
                {$unwind: {path: "$txs"}},
                {
                    $match: {
                        "txs.sender": {$in: lcSenders},
                        "txs.receipt.contract": {$ne: ""}
                    }
                },
                {
                    $group: {
                        _id: 1,
                        contracts: {$addToSet: "$txs.receipt.contract"}
                    }
                }
            ], (err, cursor) => {
                if (err) {
                    reject("Unable to run pipeline:" + err);
                }

                cursor.toArray((err, docs) => {
                    if (err) {
                        reject("Unable to get results: " + err);
                    }

                    if (docs.length > 0) {
                        resolve(docs[0].contracts);
                    } else {
                        resolve([]);
                    }
                })
            });
        });
    }

    public getDeveloperGasForAddresses(txsenders: string[]): Promise<number> {
        const lcSenders =  txsenders.map(x => x.toLowerCase());
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("voting_aggregated");
            mcBlocks.aggregate([
                {
                    $match: {"address": {$in: lcSenders}, "type":"dev"}
                },
                {
                    $group: {
                        _id: 1,
                        ct: { $sum:1},
                        gasSum: { $sum: "$gasUsed" },
                    }
                }
            ], (err, cursor) => {
                if(err) {
                    reject("unable to query: "+ err);
                }

                cursor.toArray((err, docs) => {
                    if(err) {
                        reject("Unable to read documents:" + err);
                    }
                    if(docs.length > 0) {
                        resolve(docs[0].gasSum);
                    } else {
                        resolve(0);
                    }
                })
            });
        });
    }

    public getGasSumForAddresses(txsenders: string[]): Promise<number> {
        const lcSenders =  txsenders.map(x => x.toLowerCase());
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("voting_aggregated");
            mcBlocks.aggregate([
                {
                    $match: {"address": {$in: lcSenders}, "type":"addressgas"}
                },
                {
                    $group: {
                        _id: "1",
                        gasTotal: {$sum: "$gasUsed"}
                    }
                }
            ], (err, cursor) => {
                if (err) {
                    reject("Unable to run pipeline:" + err);
                }
                cursor.toArray((err, documents) => {
                    if (err) {
                        reject("Unable to process result:" + err);
                    }
                    if (documents.length > 0) {
                        resolve(documents[0].gasTotal);
                    } else {
                        resolve(0);
                    }

                });
            });
        });
    }

    public getDifficultySumForMiners(miners: string[]): Promise<number> {
        const lcMiners =  miners.map(x => x.toLowerCase());

        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("voting_aggregated");
            mcBlocks.aggregate([
                {
                    $match: {"address": {$in: lcMiners}, "type":"miner"}
                },
                {
                    $group: {
                        _id: "1",
                        totalDifficulty: {$sum: "$difficulty"}
                    }
                }
            ], (err, cursor) => {
                if (err) {
                    reject("Unable to run pipeline:" + err);
                }
                cursor.toArray((err, documents) => {
                    if (err) {
                        reject("Unable to process result:" + err);
                    }
                    if (documents.length > 0) {
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
