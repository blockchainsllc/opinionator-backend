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
        return new Promise<{}>((res,rej) => {
            this.client.close(() => {
                res();
            });
        })
    }

    private getContractsForSender(txsenders: string[]): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {
                        "txs.sender": {$in: txsenders}
                    }
                },
                {$unwind: {path: "$txs"}},
                {
                    $match: {
                        "txs.sender": {$in: txsenders},
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
        return new Promise<number>((resolve, reject) => {
            this.getContractsForSender(txsenders).then((contracts: string[]) => {
                const mcBlocks: Collection<any> = this.db.collection("blocks");
                mcBlocks.aggregate();
                //TODO: Add missing aggregation
                resolve(0);
            });
        });
    }

    public getGasSumForAddresses(txsenders: string[]): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {"txs.sender": {$in: txsenders}}
                },
                {$unwind: {path: "$txs"}},
                {
                    $match: {"txs.sender": {$in: txsenders}}
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
                        gasTotal: {$sum: "$gas"}
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
        return new Promise<number>((resolve, reject) => {
            const mcBlocks: Collection<any> = this.db.collection("blocks");
            mcBlocks.aggregate([
                {
                    $match: {"miner": {$in: miners}}
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
                        totalDifficulty: {$sum: "$dif"}
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