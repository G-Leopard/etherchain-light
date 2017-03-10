var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');

router.get('/:account', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  var db = req.app.get('db');
  
  var data = {};
  
  async.waterfall([
    function(callback) {
      web3.eth.getBlock("latest", false, function(err, result) {
        callback(err, result);
      });
    }, function(lastBlock, callback) {
      data.lastBlock = lastBlock.number;
      web3.eth.getBalance(req.params.account, function(err, balance) {
        callback(err, balance);
      });
    }, function(balance, callback) {
      data.balance = balance;
      web3.eth.getCode(req.params.account, function(err, code) {
        callback(err, code);
      });
    }, function(code, callback) {
      data.code = code;
      if (code !== "0x") {
        data.isContract = true;
      }
      
      db.get(req.params.account.toLowerCase(), function(err, value) {
        callback(null, value);
      });
    }, function(source, callback) {
      
      if (source) {
        data.source = JSON.parse(source);
      }
      
      web3.trace.filter({ "fromBlock": "0x00", "fromAddress": [ req.params.account ] }, function(err, traces) {
        callback(err, traces);
      });
    }, function(tracesSent, callback) {
      data.tracesSent = tracesSent;
      web3.trace.filter({ "fromBlock": "0x00", "toAddress": [ req.params.account ] }, function(err, traces) {
        callback(err, traces);
      });
    }
  ], function(err, tracesReceived) {
    if (err) {
      return next(err);
    }
    
    data.address = req.params.account;
    data.tracesReceived = tracesReceived;
    
    var blocks = {};
    data.tracesSent.forEach(function(trace) {
      if (!blocks[trace.blockNumber]) {
        blocks[trace.blockNumber] = [];
      }
      
      blocks[trace.blockNumber].push(trace);
    });
    data.tracesReceived.forEach(function(trace) {
      if (!blocks[trace.blockNumber]) {
        blocks[trace.blockNumber] = [];
      }
      
      blocks[trace.blockNumber].push(trace);
    });
    
    data.tracesSent = null;
    data.tracesReceived = null;
    
    data.blocks = [];
    var txCounter = 0;
    for (block in blocks) {
      data.blocks.push(blocks[block]);
      txCounter++;
    }
    
    if (data.source) {
      data.name = data.source.name;
    } else if (config.names[data.address]) {
      data.name = config.names[data.address];
    }
    
    data.blocks = data.blocks.reverse().splice(0, 100);
    res.render('account', { account: data });
  });
  
});

module.exports = router;
