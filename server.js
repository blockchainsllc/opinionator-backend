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
  .get(function(req, res) {})

router.route('/Poll/:PollId')
  //liefert poll mit gegebener poll id (blockchain request)
  .get(function(req, res) {})

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
    var sqlReturn = await client.query('SELECT * FROM votes')
    await client.end()
    res.json(sqlReturn)
  })

  //speichert einen neuen vote
  .post(async function(req, res) {

    //check for validity of the message

    //Insert into votes (poll_id, voted_for_proposal, address, message) VALUES (stuff) 
    await client.connect()
    var sqlReturn = await client.query('INSERT INTO votes (poll_id, voted_for_proposal, address, message) VALUES (' + req.body.poll_id + ', ' + req.body.voted_for_proposal + ', ' + req.body.address + ', ' + req.body.message + ')')
    await client.end()
    res.json('message: success')
  });

router.route('/Votes/:PollId')
  //liefert alle votes des polls mit pollId
  .get(async function(req, res) {
    //SELECT * FROM votes WHERE poll_id = stuff
    await client.connect()
    var sqlReturn = await client.query('SELECT * FROM votes WHERE poll_id = ' + req.param.PollId)
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