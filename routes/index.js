const express = require('express');
const router = express.Router();
const validate = require('../logic/validator');

const FORMAT_HELP =
  'Data format: {"id": "ID of the node to validate", "content": "jsonld object to validate"}';

function checkSchemaLoaded(shexSchema, res){
  if (!shexSchema) {
    res
      .status(200)
      .json({
        success: false,
        msg:
          'Error: Validation schema not initialized. Please wait for the validator application to be initialized.'
      });
    return false;
  }
  return true;
}

function checkInputData(req, res){
  if (!req.body.content) {
    res
      .status(400)
      .json({
        success: false,
        msg:
          'Error: No object content provided'
      });
    return false;
  }
  if (!req.body.id) {
    res
      .status(400)
      .json({
        success: false,
        msg:
          'Error: No id of the object to validate provided'
      });
    return false;
  }
  return true;
}

router.use(express.json());

router.get('/', function(req, res) {
  res
    .status(200)
    .json({ msg: 'Post your content to /validate. ' + FORMAT_HELP });
});

router.get('/validate', function(req, res) {
  res.status(200).json({ msg: 'GET not allowed, use POST. ' + FORMAT_HELP });
});

router.post('/validate-digital-specimen', async (req, res) => {
  const shexSchema = req.app.locals.shexSchema;
  const schemaLoaded = checkSchemaLoaded(shexSchema, res);
  if(!schemaLoaded){
    return;
  }
  const inputOk = checkInputData(req, res);
  if(!inputOk){
    return;
  }
  try {
    const validationResult = await validate.validateDigitalSpecimen(req.body.content, shexSchema, req.body.id);
    res.status(200).json({ success: true, result: validationResult });
  } catch (e) {
    res
      .status(400)
      .json({ success: false, msg: e.message});
  }
});

router.post('/validate-image', async (req, res) => {
  const shexSchema = req.app.locals.shexSchema;
  const schemaLoaded = checkSchemaLoaded(shexSchema, res);
  if(!schemaLoaded){
    return;
  }
  const inputOk = checkInputData(req, res);
  if(!inputOk){
    return;
  }
  try {
    const validationResult = await validate.validateImage(req.body.content, shexSchema, req.body.id);
    res.status(200).json({ success: true, result: validationResult });
  } catch (e) {
    res
      .status(400)
      .json({ success: false, msg: e.message});
  }
});

module.exports = router;
