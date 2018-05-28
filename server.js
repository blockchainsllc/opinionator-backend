//The server that runs the api


//BASE SETUP
// =================================

//server requirements
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

//database requirements
var pg = require('pg')
var connectionsString = 'postgres://votingadmin:voting4slockit@localhost/voting'

//blockchain requirements
var Web3 = require('web3')
var web3 = new Web3(Web3.givenProvider || "http://localhost:8555");
const BN = require('bn.js');
var pollContractAddress = '0x4502c02c652882a0a5da0ad6b09905f5a785ad6e'
var pollContract = new web3.eth.Contract([{
  "constant": true,
  "inputs": [{
    "name": "",
    "type": "uint256"
  }],
  "name": "proposals",
  "outputs": [{
    "name": "name",
    "type": "string"
  }, {
    "name": "description",
    "type": "string"
  }, {
    "name": "author",
    "type": "address"
  }, {
    "name": "pollId",
    "type": "uint256"
  }, {
    "name": "activated",
    "type": "bool"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": false,
  "inputs": [{
    "name": "_proposalName",
    "type": "string"
  }, {
    "name": "_proposalDescription",
    "type": "string"
  }, {
    "name": "_pollId",
    "type": "uint256"
  }],
  "name": "createProposal",
  "outputs": [],
  "payable": false,
  "stateMutability": "nonpayable",
  "type": "function"
}, {
  "constant": true,
  "inputs": [{
    "name": "_pollId",
    "type": "uint256"
  }],
  "name": "getPoll",
  "outputs": [{
    "components": [{
      "name": "name",
      "type": "string"
    }, {
      "name": "description",
      "type": "string"
    }, {
      "name": "proposalIds",
      "type": "uint256[]"
    }, {
      "name": "author",
      "type": "address"
    }, {
      "name": "allowProposalUpdate",
      "type": "bool"
    }, {
      "name": "startDate",
      "type": "uint256"
    }, {
      "name": "endDate",
      "type": "uint256"
    }, {
      "name": "votingChoice",
      "type": "uint8"
    }],
    "name": "",
    "type": "tuple"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": false,
  "inputs": [{
    "name": "_name",
    "type": "string"
  }, {
    "name": "_description",
    "type": "string"
  }, {
    "name": "_startDate",
    "type": "uint256"
  }, {
    "name": "_endDate",
    "type": "uint256"
  }, {
    "name": "_votingChoice",
    "type": "uint8"
  }],
  "name": "createPoll",
  "outputs": [],
  "payable": false,
  "stateMutability": "nonpayable",
  "type": "function"
}, {
  "constant": false,
  "inputs": [{
    "name": "_proposalId",
    "type": "uint256"
  }, {
    "name": "_pollId",
    "type": "uint256"
  }],
  "name": "addProposalToPoll",
  "outputs": [],
  "payable": false,
  "stateMutability": "nonpayable",
  "type": "function"
}, {
  "constant": true,
  "inputs": [{
    "name": "",
    "type": "uint256"
  }],
  "name": "polls",
  "outputs": [{
    "name": "name",
    "type": "string"
  }, {
    "name": "description",
    "type": "string"
  }, {
    "name": "author",
    "type": "address"
  }, {
    "name": "allowProposalUpdate",
    "type": "bool"
  }, {
    "name": "startDate",
    "type": "uint256"
  }, {
    "name": "endDate",
    "type": "uint256"
  }, {
    "name": "votingChoice",
    "type": "uint8"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": true,
  "inputs": [{
    "name": "_pollId",
    "type": "uint256"
  }],
  "name": "getProposalsFromPoll",
  "outputs": [{
    "name": "",
    "type": "uint256[]"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": true,
  "inputs": [],
  "name": "getPollAmount",
  "outputs": [{
    "name": "",
    "type": "uint256"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": true,
  "inputs": [{
    "name": "_proposalId",
    "type": "uint256"
  }],
  "name": "getProposal",
  "outputs": [{
    "name": "",
    "type": "string"
  }, {
    "name": "",
    "type": "string"
  }, {
    "name": "",
    "type": "address"
  }, {
    "name": "",
    "type": "uint256"
  }],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "anonymous": false,
  "inputs": [{
    "indexed": false,
    "name": "proposalId",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "proposalAuthor",
    "type": "address"
  }, {
    "indexed": false,
    "name": "pollId",
    "type": "uint256"
  }],
  "name": "LogCreateProposal",
  "type": "event"
}, {
  "anonymous": false,
  "inputs": [{
    "indexed": false,
    "name": "pollId",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "pollAuthor",
    "type": "address"
  }],
  "name": "LogCreatePoll",
  "type": "event"
}, {
  "anonymous": false,
  "inputs": [{
    "indexed": false,
    "name": "pollId",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "proposalId",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "proposalAuthor",
    "type": "address"
  }],
  "name": "LogProposalActivated",
  "type": "event"
}], pollContractAddress)

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

var port = process.env.PORT || 9999;

//ROUTES FOR API
// =================================

var router = express.Router();

//middleware
router.use(async function(req, res, next) {
  //allow cross site scripting
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  try {
    next();
  } catch (err) {
    console.log(err)
    res.status(500).send("Oops, something went wrong!")
  }
});

//standart route
router.get('/', function(req, res) {
  res.json({
    message: 'Blockchain voting for the win!'
  });
});

router.route('/Poll')
  //delivers a list of all polls (blockchain request)
  .get(async function(req, res) {
    try {
      var amountOfPolls = await pollContract.methods.getPollAmount().call();
      var reslutObj = new Array();
      for (let i = 0; i < amountOfPolls; i++) {
        let pollObject = await pollContract.methods.polls(i).call()
        //parse the object returned from the contract to adapt to our needs
        reslutObj.push({
          author: pollObject.author,
          allowProposalUpdate: pollObject.allowProposalUpdate,
          startDate: pollObject.startDate,
          endDate: pollObject.endDate,
          votingChoice: pollObject.votingChoice
        })
      }
    } catch (err) {
      console.error(err)
      res.status(500).send('Blockchain Error')
    }

    res.json(reslutObj)
  })

router.route('/Poll/:PollId')
  //delivers poll with given poll id (blockchain request)
  .get(async function(req, res) {
    var resultObj = new Array();
    try {
      var poll = await pollContract.methods.polls(req.params.PollId).call();
    } catch (err) {
      console.error(err)
      res.status(500).send("Blockchain Error")
    }
    resultObj.push({
      author: poll.author,
      allowProposalUpdate: poll.allowProposalUpdate,
      startDate: poll.startDate,
      endDate: poll.endDate,
      votingChoice: poll.votingChoice
    })
    res.json(resultObj)
  })

router.route('/Proposal/:ProposalId')
  //liefert einen proposal mit gegebener id (blockchain request)
  .get(async function(req, res) {
    var resultObj = new Array();
    try {
      var proposal = await pollContract.methods.proposals(req.params.ProposalId).call();
    } catch (err) {
      console.error(err)
      res.status(500).send("Blockchain Error")
    }
    //parse the object returned from the contract to adapt to our needs
    resultObj.push({
      name: proposal.name,
      description: proposal.description,
      author: proposal.author,
      pollId: proposal.pollId
    })
    res.json(resultObj)
  });

router.route('/Votes')
  //delivers all votes given (database request)
  //@developer should be considerd to be turned of to avoid to much data being send (limit to poll)
  .get(async function(req, res) {
    var client = new pg.Client(connectionsString)
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT * FROM votes;')
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }
    await client.end()
    res.json(sqlReturn.rows)
  })

  //stores a vote passed with the post
  .post(async function(req, res) {
    var messageObject = JSON.parse(req.body.message)
    //check for validity of the message
    var poll_id = messageObject.poll_id
    var proposal_id = messageObject.proposal_id
    var contract_address = messageObject.pollContractAddress
    var signature = req.body.signature

    //check if the contract in the passed message is supported by slockit
    if (contract_address.localeCompare(pollContractAddress) != 0) {
      res.status(400).send("Unsupported Contract!")
      throw "Unsupported Contract"
    }

    //get the address from the signature
    try {
      var address = await web3.eth.accounts.recover(req.body.message, req.body.signature)
    } catch (err) {
      console.error(err)
      res.status(500).send('Invalid message format!')
    }

    //delete 0x (for database use)
    addressNox = address.substring(2)

    var client = new pg.Client(connectionsString)
    await client.connect()

    //check if the address has gas spend to avoid db spaming
    try {
      var sqlAddressValue = await client.query("SELECT SUM(gas_used) FROM transactions WHERE tx_sender = LOWER('" + addressNox + "');")
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }
    if (isEmpty(sqlAddressValue.rows)) {
      res.status(400).send("Unused Addresses are not supported!")
      throw "Invalid signature"
    }

    //check if vote already exists and what to do with it
    var sqlValue = await client.query("SELECT message FROM votes WHERE address = LOWER('" + addressNox + "') AND poll_id = '" + poll_id + "';")
    //if no entry for that poll from this address then insert
    if (isEmpty(sqlValue.rows)) {
      try {
        var sqlReturn = await client.query("INSERT INTO votes (poll_id, voted_for_proposal, address, message) VALUES ('" + poll_id + "', '" + proposal_id + "', LOWER('" + addressNox + "'), '" + JSON.stringify(req.body) + "');")
      } catch (err) {
        await client.end()
        console.error(err)
        res.status(500).send('Database Error - Error Inserting!')
      }
      await client.end()
      res.json({
        message: "success - vote taken",
        successfullyVoted: true
      })
    } else {
      //check contract on how the poll is supposed to react if the address already voted
      let pollObject = await pollContract.methods.polls(poll_id).call()
      if (pollObject.votingChoice == 0)
      //if useNewestVote
      //    UPDATE
      {
        try {
          var sqlReturn = await client.query("UPDATE votes SET voted_for_proposal = " + proposal_id + ", message = '" + JSON.stringify(req.body) + "' WHERE poll_id = " + poll_id + " AND address = LOWER('" + addressNox + "');")
        } catch (err) {
          await client.end()
          console.error(err)
          res.status(500).send('Database Error - Error Updating your Vote!')
        }
        await client.end()
        res.json({
          message: "success - New vote has been noted",
          successfullyVoted: true
        })
      }

      if (pollObject.votingChoice == 2)
      //if nullifyAllOnDoubleVote
      //    UPDATE with 0
      {
        try {
          var sqlReturn = await client.query("UPDATE votes SET voted_for_proposal = '" + proposal_id + "', message = '" + JSON.stringify({
              banned: 'for double voting'
            }) + "' WHERE contract_address = '" + contract_address + "';")
        } catch (err) {
          await client.end()
          console.error(err)
          res.status(500).send('Database Error - Error Updating your Vote!')
        }
        await client.end()
        res.json({
          message: "success - This poll does not allow double voting, your vote was nullified",
          successfullyVoted: false
        })
      }

      //if useOldestVote
      //    do nothing
      if (pollObject.votingChoice == 1) {
        await client.end()
        res.json({
          message: "success - This poll does not allow new votes",
          successfullyVoted: false
        })
      }
    }
    //if that line is executed then something is wrong with the contract or so
    await client.end()
    res.json({
      message: "success - you shouldnt be here O.o",
      successfullyVoted: false
    })
  });

router.route('/Votes/:PollId')
  //delivers all polls for the poll with given id
  .get(async function(req, res) {
    var client = new pg.Client(connectionsString)
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT * FROM votes WHERE poll_id = ' + req.params.PollId + ';')
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }
    await client.end()
    res.json(sqlReturn.rows)
  })

router.route('/Votes/Gas/:PollId/:ProposalId')
  //delivers the accumulated gas of all addresses that voted on specified proposal and the accumulated coin value of same proposal
  .get(async function(req, res) {
    var client = new pg.Client(connectionsString)
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT SUM(transactions.gas_used) FROM transactions INNER JOIN votes ON LOWER(votes.address) = LOWER(transactions.tx_sender) AND votes.voted_for_proposal = ' + req.params.ProposalId + ' AND votes.poll_id = ' + req.params.PollId + ';')
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }

    try {
      var addressList = await client.query('SELECT address FROM votes WHERE poll_id = ' + req.params.PollId + ' AND voted_for_proposal = ' + req.params.ProposalId + ';')
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }

    var sum = new BN(0);
    for (let element of addressList.rows) {
      //console.log(sum.toString())
      var biggy = new BN(await web3.eth.getBalance("0x" + element.address))
      sum = sum.add(biggy);
    }

    await client.end()
    res.json({
      gas_sum: sqlReturn.rows,
      coin_sum: sum.toString()
    })


  })

router.route('/Votes/Miner/:PollId/:ProposalId')
  //delivers the accumulated difficulty solved of all miners that voted on specified proposal and the accumulated coin value of same proposal
  .get(async function(req, res) {
    var client = new pg.Client(connectionsString)
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT SUM(difficulty) FROM block INNER JOIN votes ON votes.address = block.miner AND votes.voted_for_proposal = ' + req.params.ProposalId + ' AND votes.poll_id = ' + req.params.PollId + ' GROUP BY block.miner;')
    } catch (err) {
      await client.end()
      console.error(err)
      res.status(500).send('Database Error - Error Selecting!')
    }

    await client.end()
    res.json({
      gas_sum: sqlReturn.rows
    })

  })

//REGISTER ROUTES
  // =================================

app.use('/api', router);

//START THE SERVER
// =================================

app.listen(port);
console.log('stuff happens');



function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key))
      return false;
  }
  return true;
}
