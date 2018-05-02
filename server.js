//The server that runs the api


//BASE SETUP
// =================================

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

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
  //liefert Liste mit allen Polls
  .get(function(req, res) {})

  //erstellt einen neuen poll
  .post(function(req, res) {});

router.route('/Poll/:PollId')
  //liefert poll mit gegebener poll id
  .get(function(req, res) {})

router.route('/Votes')
  //liefert Liste aller votes
  .get(function(req, res) {})

  //speichert einen neuen vote
  .post(function(req, res) {});

router.route('/Votes/:PollId')
  //liefert alle votes des polls mit pollId
  .get(function(req, res) {})

router.route('/Proposal')
  //erstellt einen neuen proposal request fuer einen poll
  .post(function(req, res) {});

//REGISTER ROUTES
  // =================================

app.use('/api', router);

//START THE SERVER
// =================================

app.listen(port);
console.log('stuff happens');