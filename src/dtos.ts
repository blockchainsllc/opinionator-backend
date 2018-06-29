export interface PollDto {
    author: string,
    allowProposalUpdate: boolean,
    startDate: string,
    endDate: string
    votingChoice: string
}

 export interface ProposalDto {
     name: string,
     description: string,
     author: string,
     pollId: number
 }
