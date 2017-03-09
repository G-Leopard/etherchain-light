var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');
var net = require('net');

router.get('/:block', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();

  web3.setProvider(new web3.providers.IpcProvider(config.backend, require('net')));
  
  async.waterfall([
    function(callback) {
      web3.eth.getBlock(req.params.block, true, function(err, result) {
        callback(err, result);
      });
    }, function(result, callback) {
      if (!result) {
        return next({name : "BlockNotFoundError", message : "Block not found!"});
      }
      web3.trace.block(result.number, function(err, traces) {
        callback(err, result, traces);
      });
    }
  ], function(err, block, traces) {
    if (err) {
      return next(err);
    }
    
    block.transactions.forEach(function(tx) {
      tx.traces = [];
      tx.failed = false;
      traces.forEach(function(trace) {
        if (tx.hash === trace.transactionHash) {
          tx.traces.push(trace);
          if (trace.error) {
            tx.failed = true;
            tx.error = trace.error;
          }
        }
      });
      // console.log(tx);
    });
    res.render('block', { block: block });
  });
  
});

module.exports = router;
