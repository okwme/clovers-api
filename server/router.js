var express = require('express');

// Get API implementation.
var api = require('./api');

// Set up router.
var router = express.Router();
router.get('/', (req, res) => res.status(200).send('✤'))
router.get('/clover', api.clover.getAll);
router.get('/clover/:id', api.clover.getOne);

router.get('/user', api.user.getAll);
router.get('/user/:id', api.user.getOne);

router.get('/chat/:id', api.user.getAll);
// router.post('/chat/:id', api.user.postChat);

module.exports = router;
