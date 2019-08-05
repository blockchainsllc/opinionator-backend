import {Collection, MongoClient} from "mongodb";
import winston from 'winston';

const mongourl: string = process.env.MONGO_URL || 'mongodb://10.142.1.25:27017';
const mongoname: string = process.env.MONGO_NAME|| 'voting';

export function preAggregate(logger: winston.Logger) {
    return new Promise((resolve, reject) => {
        logger.info("Start pre aggregation");

        MongoClient.connect(mongourl,{ useNewUrlParser: true }, (err, client) => {
            if (err) {
                logger.error("Unable to connect to mongo db: " + err);
                reject();
            }

            const votedb = client.db(mongoname);

            // gert collections
            const mcBlocks = votedb.collection('blocks');
            const mcVoting = votedb.collection('voting_aggregated');


            // get all addresses that have voted
            const mcVotes: Collection<any> = votedb.collection("votes");

            mcVotes.aggregate([
                { $group: {
                    _id:1,
                    addresses: { $addToSet: "$address"}
                }}
            ],(err,cursor) => {
                if(err) {
                    logger.error("Unable to grab all voted addresses",{stack: err.stack, msg: err.message});
                    reject();
                }

                cursor.toArray((err, docs) => {
                    const proms: any[] = [];
                    // For each address pull transactions
                    if(docs.length === 0) {
                        logger.info("No votes - nothing to pre aggregate.")
                        resolve();
                        return;
                    }
                    const addresses = docs[0].addresses.map((x:string) => x.toLowerCase());
                    
                    addresses.forEach((addr:string) => {
                        logger.info("Process address: " + addr);
                        proms.push(processAddress(addr, mcBlocks,mcVoting));
                    })
                    
                    Promise.all(proms).then(() => {
                        logger.info("pre-aggregate finished");
                        client.close();
                        resolve();
                    })

                });
            })
        });
    });
}


function getContractsForSender(txsenders: string[], mcBlocks: any): Promise<string[]> {
    const lcSenders =  txsenders.map(x => x.toLowerCase());
    return new Promise<string[]>((resolve, reject) => {
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
        ], (err: any, cursor: any) => {
            if (err) {
                reject("Unable to run pipeline:" + err);
            }

            cursor.toArray((err: any, docs: any) => {
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

function getMaxBlockForAddr(mcVoting: any, address:string):Promise<number> {
    return new Promise((resolve,rej) => {
        // geth highest block
        mcVoting.aggregate([
            {$match: { address: address }},
            {$group: { _id:1, maxblock: { $max: "$bn"}}}
        ], (err: any, cursor: any) => {
            cursor.toArray((err: any, docs: any[]) => {
                if(docs.length === 0) {
                    resolve(0);
                } else {
                    resolve(docs[0].maxblock);
                }
            });
        });

    });
}

function getDevGas(mcBlocks: any, maxblock: number, contracts: string[], address:string, mcVoting:any) {
    return new Promise((resolve, reject) => {
        // Developer Gas
        mcBlocks.aggregate([
            { $match: { "bn": { $gt: maxblock}, "txs.traces.to":{ $in: contracts } } },
            { $unwind: { path : "$txs" } },
            { $unwind: { path : "$txs.traces" } },
            { $match: { "txs.traces.to":{ $in: contracts } } },
            {
                $project: {
                    contract: "$txs.traces.to",
                    gasUsed: "$txs.traces.gasused",
                    ts: "$ts",
                    bn: "$bn",
                    _id:0
                }
            }
        ], (err: any, cursor: any) => {
            if(err) {
                console.error("unable to query: "+ err);
                reject();
            }

            cursor.each((err: any, doc: any) => {
                if(doc === null) {
                    resolve();
                    return;
                }
                if(err) {
                    console.error("Unable to read documents:" + err);
                    reject();
                }
                
                if(doc.gasUsed === 0) {
                    return;
                }

                const insert = {
                    address: address,
                    type: 'dev',
                    ...doc
                };

                mcVoting.insertOne(insert);
                //process.stdout.write('.');
                //console.log("TX from block " + doc.bn + " inserted");
            });

        });
    });
}

function getGasSumForAddresses(mcBlocks: any, maxblock: number, address:string, mcVoting:any) {
    return new Promise((resolve, reject) => {
        // Developer Gas
        mcBlocks.aggregate([
            { $match: { "bn": { $gt: maxblock}, "txs.sender": address }},
            { $unwind: { path : "$txs" } },
            { $match: { "txs.sender":address } },
            {
                $project: {
                    gasUsed: "$txs.receipt.gasused",
                    ts: "$ts",
                    bn: "$bn",
                    _id:0
                }
            }
        ], (err: any, cursor: any) => {
            if(err) {
                console.error("unable to query: "+ err);
                reject()
            }

            cursor.each((err: any, doc: any) => {
                if(doc === null) {
                    resolve();
                    return;
                }
                if(err) {
                    console.error("Unable to read documents:" + err);
                    reject();
                }
                
                if(doc.gasUsed === 0) {
                    return;
                }

                const insert = {
                    address: address,
                    type: 'addressgas',
                    ...doc
                };

                mcVoting.insertOne(insert);
                
            });

        });
    });
}

function getDifficultySumForMiners(mcBlocks: any, maxblock: number, address:string, mcVoting:any) {
    return new Promise((resolve, reject) => {
        // Developer Gas
        mcBlocks.aggregate([
            { $match: { "bn": { $gt: maxblock}, "miner": address }},
            {
                $project: {
                    difficulty: "$dif",
                    ts: "$ts",
                    bn: "$bn",
                    _id:0
                }
            }
        ], (err: any, cursor: any) => {
            if(err) {
                console.error("unable to query: "+ err);
                reject();
            }

            cursor.each((err: any, doc: any) => {
                if(doc === null) {
                    resolve();
                    return;
                }
                if(err) {
                    console.error("Unable to read documents:" + err);
                    reject();
                }
                
                if(doc.gasUsed === 0) {
                    return;
                }

                const insert = {
                    address: address,
                    type: 'miner',
                    ...doc
                };

                mcVoting.insertOne(insert);
                
            });

        });
    });
}

function processAddress(address: string, mcBlocks: any,mcVoting:any) {
    return new Promise(async (resolve,reject) => {

        const maxblock: number = await getMaxBlockForAddr(mcVoting, address);
        const contracts: string[] = await getContractsForSender([address], mcBlocks);
       
        await getDevGas(mcBlocks,maxblock,contracts,address,mcVoting);
        await getGasSumForAddresses(mcBlocks,maxblock,address,mcVoting);
        await getDifficultySumForMiners(mcBlocks,maxblock,address,mcVoting);
        
        resolve();
    });
}