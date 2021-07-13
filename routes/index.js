const express = require('express');
const router = express.Router();
const validate = require('../logic/validator');

const FORMAT_HELP = 'Data format: {"id": "ID of the node to validate", "content": "jsonld object to validate"}';

router.use(express.json());

router.get('/', function(req, res) {
  res.status(200).json({ msg: 'Post your content to /validate. ' + FORMAT_HELP});
});

router.get('/validate', function(req, res) {
  res.status(200).json({ msg: 'GET not allowed, use POST. ' + FORMAT_HELP});
});

router.post('/validate', async(req, res) => {
  try {
    const validationResult = await validate(req.body.content, req.body.id);
    res.status(200).json({"success": true, "result": validationResult});
  } catch(e) {
    res.status(200).json({"success": false, "msg":"An error occurred during validation"});
  };
});

module.exports = router;
