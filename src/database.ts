import {BlockChainDatabase} from "./blockChainDatabase";

export interface IDatabaseOptions {
    mongoUrl: string;
    mongoDbName: string;
}

export default class Database {

    private mongoUrl: string;
    private mongoDbName: string;

    constructor(opts: IDatabaseOptions) {
        this.mongoUrl = opts.mongoUrl;
        this.mongoDbName = opts.mongoDbName;
    }

    public close() {
    }

    public async getAllVotes() : Promise<Vote[]> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const votes: any[] = await mongo.getVotes(-1);
        await mongo.close();
        return votes;
    }

    public async getVotesForPoll(pollId: number) : Promise<Vote[]> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const votes: any[] = await mongo.getVotes(pollId);
        await mongo.close();
        return votes;
    }

    public async getGasSumForAddress(address: string) : Promise<number> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const gasForAddr: number = await mongo.getGasSumForAddress(address);
        await mongo.close();
        return gasForAddr;
    }

    public async checkVoteExists(pollId: number, address: string) :Promise<boolean> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const numVotes: number = await mongo.checkIfVoteExist(pollId,address);
        await mongo.close();
        return numVotes > 0;
    }

    public async createVote(pollId: number, proposalId: number, address: string, message: string) : Promise<void> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        await mongo.createVote(pollId,proposalId,address,message);
        await mongo.close();
    }

    public async updateVote(pollId: number, proposalId: number, address: string, message: string) : Promise<void> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        await mongo.updateVote(pollId,proposalId,address,message);
        await mongo.close();
    }

    public async getTotalTrxGasForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const gas: number = await mongo.getGasSumForAddresses(addresses);
        await mongo.close();
        return gas;
    }

    public async getTotalDifficultyForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const sumDiff: number = await mongo.getDifficultySumForMiners(addresses);
        await mongo.close();
        return sumDiff;

    }

    public async getTotalContractGasForProposal(pollId: number, proposalId: number) : Promise<number> {
        const addresses: string[] = await this.getAddressesForProposal(pollId,proposalId);
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const gas: number = await mongo.getDeveloperGasForAddresses(addresses);
        await mongo.close();
        return gas;
    }

    public async getAddressesForProposal(pollId: number, proposalId: number) : Promise<string[]> {
        const mongo = new BlockChainDatabase(this.mongoUrl,this.mongoDbName);
        await mongo.connect();
        const addresses: string[] = await mongo.getAddressForProposal(pollId,proposalId);
        await mongo.close();
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