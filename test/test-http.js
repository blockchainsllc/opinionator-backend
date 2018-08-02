const request = require('supertest');
const expect = require('chai').expect;

describe('Voting Backend Service', () => {
    let server;
    beforeEach(() => {
        server = require('../build/server.js');
    });

    afterEach(() => {
        server.close();
    });

    describe('Calls to Blockchain', () => {
        it('Backend responds to GET /api with greeting', (done) => {
            request(server)
                .get('/api')
                .expect(200, {
                    message: "Blockchain voting for the win!"
                }, done);
        });

        it('Backend responds to GET /poll with list of polls', (done) => {
            request(server)
                .get('/api/poll')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('array');
                    expect(res.body, 'json response').to.have.length(2);

                    //test both polls
                    for (var i = 0; i < res.body.length; i++) {
                        expect(res.body[i], 'poll #' + i)
                            .to.have.property('author').that.is.a('string');
                        expect(res.body[i], 'poll #' + i)
                            .to.have.property('allowProposalUpdate').that.is.a('boolean');
                        expect(res.body[i], 'poll #' + i)
                            .to.have.property('startDate').that.is.a('string');
                        expect(res.body[i], 'poll #' + i)
                            .to.have.property('endDate').that.is.a('string');
                        expect(res.body[i], 'poll #' + i)
                            .to.have.property('votingChoice').that.is.a('string');
                    }
                })
                .end(done);
        });

        it('Backend responds to GET /poll/:pollid with a single poll', (done) => {
            request(server)
                .get('/api/poll/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('array');
                    expect(res.body, 'json response').to.have.length(1);

                    //test poll structure
                    expect(res.body[0], 'poll 0')
                        .to.have.property('author').that.is.a('string');
                    expect(res.body[0], 'poll 0')
                        .to.have.property('allowProposalUpdate').that.is.a('boolean');
                    expect(res.body[0], 'poll 0')
                        .to.have.property('startDate').that.is.a('string');
                    expect(res.body[0], 'poll 0')
                        .to.have.property('endDate').that.is.a('string');
                    expect(res.body[0], 'poll 0')
                        .to.have.property('votingChoice').that.is.a('string');

                })
                .end(done);
        });

        it('Backend responds to GET /proposal/:proposalid with a single proposal', (done) => {
            request(server)
                .get('/api/proposal/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('array');
                    expect(res.body, 'json response').to.have.length(1);

                    //test poll structure
                    expect(res.body[0], 'proposal -> name')
                        .to.have.property('name').that.is.a('string');
                    expect(res.body[0], 'proposal -> description')
                        .to.have.property('description').that.is.a('string');
                    expect(res.body[0], 'proposal -> author')
                        .to.have.property('author').that.is.a('string');
                    expect(res.body[0], 'proposal -> pollid')
                        .to.have.property('pollId').that.is.a('string');

                })
                .end(done);
        });

    });

    describe('Database calls against MongoDB', () => {
        it('Backend responds to GET /votes/miner/0/0 with some difficulty', (done) => {
            request(server)
                .get('/api/votes/miner/0/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('object');
                    expect(res.body)
                        .to.have.property('gas_sum').that.is.a('number');

                })
                .end(done);

        });
        it('Backend responds to GET /votes/dev/0/0 with some gas', (done) => {
            request(server)
                .get('/api/votes/dev/0/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('object');
                    expect(res.body)
                        .to.have.property('gas_sum').that.is.a('number');
                })
                .end(done);

        });
        it('Backend responds to GET /votes/gas/0/0 with some gas', (done) => {
            request(server)
                .get('/api/votes/gas/0/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('object');
                    expect(res.body)
                        .to.have.property('gas_sum').that.is.a('number');
                    expect(res.body)
                        .to.have.property('coin_sum').that.is.a('string');
                })
                .end(done);

        });
    });


    describe('Database calls against PostgreSQL', () => {
        it('Backend responds to POST /votes with no error', (done) => {
            //TODO: fill in
            done();
        });

        it('Backend responds to GET /votes with list of known votes', (done) => {
            request(server)
                .get('/api/votes')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('array');

                    //test vote schema
                    for (var i = 0; i < res.body.length; i++) {
                        expect(res.body[i], 'vote' + i + ' -> voteId')
                            .to.have.property('voteId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> pollId')
                            .to.have.property('pollId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> proposalId')
                            .to.have.property('proposalId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> timestamp')
                            .to.have.property('timestamp').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> voterAddress')
                            .to.have.property('voterAddress').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> message')
                            .to.have.property('message').that.is.a('object');
                        expect(res.body[i], 'vote' + i + ' -> isValid')
                            .to.have.property('isValid').that.is.a('boolean');
                    }
                })
                .end(done);
        });

        it('Backend responds to GET /votes/0 with the first vote', (done) => {
            request(server)
                .get('/api/votes/0')
                .expect(200)
                .expect((res) => {
                    expect(res.body, 'json response').to.be.a('array');
                    expect(res.body, 'json response').to.have.length(1);

                    //test vote schema
                    for (var i = 0; i < res.body.length; i++) {
                        expect(res.body[i], 'vote' + i + ' -> voteId')
                            .to.have.property('voteId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> pollId')
                            .to.have.property('pollId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> proposalId')
                            .to.have.property('proposalId').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> timestamp')
                            .to.have.property('timestamp').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> voterAddress')
                            .to.have.property('voterAddress').that.is.a('string');
                        expect(res.body[i], 'vote' + i + ' -> message')
                            .to.have.property('message').that.is.a('object');
                        expect(res.body[i], 'vote' + i + ' -> isValid')
                            .to.have.property('isValid').that.is.a('boolean');
                    }
                })
                .end(done);
        });
    });
});