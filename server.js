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
var client = new pg.Client(connectionsString)

//blockchain requirements
var Web3 = require('web3')
var web3 = new Web3(Web3.givenProvider || "http://localhost:8545");
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
    "name": "_proposalId",
    "type": "uint256[]"
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
  "name": "activateProposalForPoll",
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
}], "0xb0e901f8a110fe84b3f1904e95b4e0ae75211aaa")

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

var port = process.env.PORT || 9999;

//ROUTES FOR API
// =================================

var router = express.Router();

//middleware
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get('/', function(req, res) {
  res.json({
    message: 'Blockchain voting for the win!'
  });
});

router.route('/Poll')
  //liefert Liste mit allen Polls (blockchain request)
  .get(async function(req, res) {
    var amountOfPolls = await pollContract.methods.getPollAmount().call();
    var reslutObj = new Array();
    for (let i = 0; i < amountOfPolls; i++) {
      let pollObject = await pollContract.methods.polls(i).call()
      reslutObj.push({
        author: pollObject.author,
        allowProposalUpdate: pollObject.allowProposalUpdate,
        startDate: pollObject.startDate,
        endDate: pollObject.endDate,
        votingChoice: pollObject.votingChoice
      })
    }

    res.json(reslutObj)
  })

router.route('/Poll/:PollId')
  //liefert poll mit gegebener poll id (blockchain request)
  .get(async function(req, res) {})

router.route('/Proposal/:ProposalId')
  //liefert einen proposal mit gegebener id (blockchain request)
  .get(function(req, res) {});

/*
    id bigint NOT NULL,
    poll_id bigint NOT NULL,
    voted_for_proposal bigint NOT NULL,
    "timestamp" bigint NOT NULL,
    address character(40) NOT NULL,
    message jsonb NOT NULL
*/

router.route('/Votes')
  //liefert Liste aller votes
  .get(async function(req, res) {
    //Select * FROM votes
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT * FROM votes;')
    } catch (err) {
      await client.end()
    }
    await client.end()
    res.json(sqlReturn)
  })

  //speichert einen neuen vote
  .post(async function(req, res) {

    var messageObject = JSON.parse(req.body.message)
    //check for validity of the message
    var poll_id = messageObject.poll_id
    var proposal_id = messageObject.proposal_id
    var contract_address = messageObject.address
    var signature = req.body.signature

    //var address = await web3.eth.personal.ecRecover(req.body.message, req.body.signature)
    //var address = await web3.eth.accounts.recover(req.body.message, req.body.signature)
    //var address = await web3.eth.personal.ecRecover("Hello world", "0x30755ed65396facf86c53e6217c52b4daebe72aa4941d89635409de4c9c7f9466d4e9aaec7977f05e923889b33c0d0dd27d7226b6e6f56ce737465c5cfd04be400")
    var address = await web3.eth.accounts.recover('0x1da44b586eb0729ff70a73c326926f6ed5a25f5b056e7f47fbc6e58d86871655', '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c');
    //delete 0x
    address = address.substring(2)
    //var test = req.body;
    //console.log("INSERT INTO votes (poll_id, voted_for_proposal, address, message) VALUES ('" + poll_id + "', '" + proposal_id + "', '" + address + "', '" + JSON.stringify(test) + "');")
    //Insert into votes (poll_id, voted_for_proposal, address, message) VALUES (stuff) 
    await client.connect()
    try {
      var sqlReturn = await client.query("INSERT INTO votes (poll_id, voted_for_proposal, address, message) VALUES ('" + poll_id + "', '" + proposal_id + "', '" + address + "', '" + JSON.stringify(req.body) + "');")
    } catch (err) {
      await client.end()
    }
    await client.end()
    res.json('"message": "success"')
  });

router.route('/Votes/:PollId')
  //liefert alle votes des polls mit pollId
  .get(async function(req, res) {
    //SELECT * FROM votes WHERE poll_id = stuff
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT * FROM votes WHERE poll_id = ' + req.params.PollId + ';')
    } catch (err) {
      await client.end()
    }
    await client.end()
    res.json(sqlReturn)
  })

router.route('/Votes/Gas/:PollId/:ProposalId')
  //liefert accumulated gas pro addresse
  .get(async function(req, res) {
    //SELECT SUM(address_value_mapping.accumulated_gas_usage) FROM address_value_mapping INNER JOIN votes ON votes.address = address_value_mapping.address AND votes.voted_for_proposal = ' + req.params.ProposalId + ' AND votes.poll_id = ' + req.params.PollId + ';'
    await client.connect()
    try {
      var sqlReturn = await client.query('SELECT SUM(address_value_mapping.accumulated_gas_usage) FROM address_value_mapping INNER JOIN votes ON votes.address = address_value_mapping.address AND votes.voted_for_proposal = ' + req.params.ProposalId + ' AND votes.poll_id = ' + req.params.PollId + ';')
    } catch (err) {
      await client.end()
    }
    await client.end()
    res.json(sqlReturn)
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