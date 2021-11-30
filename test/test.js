const assert = require('assert');
const validate = require('../logic/validator');
const https = require('https');
const ShExParser = require('@shexjs/parser');

const config = require('../config/config');

const testDigitalSpecimen1 = {
  '@id': 'https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52',
  '@context': {
    ods: 'http://github.com/hardistyar/openDS/ods-ontology/terms/'
  },
      '@type': 'ods:DigitalSpecimen',
      'ods:authoritative': {
        'ods:midsLevel': 1,
        'ods:name': 'Elophila nymphaeata (Linnaeus, 1758)',
        'ods:curatedObjectID': 'NHMUK010517563',
        'ods:institution': 'something',
        'ods:institutionCode': 'NHM'
      }

};

const testDigitalSpecimen2 = {
  '@context': {
    ods: 'http://github.com/hardistyar/openDS/ods-ontology/terms/'
  },
  '@graph': [
    {
      '@id': 'https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52',
      'ods:authoritative': {
        'ods:midsLevel': [{ '@value': 'one' }],
        'ods:name': [{ '@value': 'Elophila nymphaeata (Linnaeus, 1758)' }],
        'ods:curatedObjectID': [{ '@value': 'NHMUK010517563' }],
        'ods:institution': [{ '@value': 'something'}],
        'ods:institutionCode': [{ '@value': 'NHM' }]
      }
    }
  ]
}

const testImageObject1 = {
  '@context': {
    ods: 'http://github.com/hardistyar/openDS/ods-ontology/terms/'
  },
  '@graph': [
    {
      '@id': 'https://doi.org/20.5000.1025/2211aa3a666ec72dbc52',
      'ods:imageURI': [{ '@value': 'https://search.senckenberg.de/pix/preview/sesam/32/63648.jpg' }],
      'ods:imageWidth': [{ '@value': 6547 }],
      'ods:imageHeight': [{ '@value': 9584 }],
      'ods:imageSizeUnit': [{ '@value': 'pixel' }],
      'ods:colorSpace': [{ '@value': '' }],
      'ods:iccProfileName': [{ '@value': '' }],
      'ods:xResolution': [{ '@value': 0 }],
      'ods:yResolution': [{ '@value': 0 }],
      'ods:imageResolutionUnit': [{ '@value': 'pixel' }],
      'ods:creator': [{ '@value': '' }]
    }
  ]
}

const testImageObject2 = {
  '@context': {
    ods: 'http://github.com/hardistyar/openDS/ods-ontology/terms/'
  },
  '@id': 'https://doi.org/20.5000.1025/2211aa3a666ec72dbc52',
  'ods:imageUR': 'https://search.senckenberg.de/pix/preview/sesam/32/63648.jpg',
  'ods:imageWidth': 6547,
  'ods:imageHeight': 9584,
  'ods:imageSizeUnit': 'pixel',
  'ods:colorSpace': '',
  'ods:iccProfileName': '',
  'ods:xResolution': 0,
  'ods:yResolution': 0,
  'ods:imageResolutionUnit': 'pixel',
  'ods:creator': ''
}

const createSchema = () => {
  return fetch(config.schemaUrl)
    .then(res => res.text())
    .then(schemaTxt => {
      const shParser = ShExParser.construct();
      const parsedSchema = shParser.parse(schemaTxt);
      return parsedSchema;
    });
};

describe('Test 1', () => {
  let schema;
  before(async function() {
    schema = await createSchema();
  });
  it('Object validation should be conformant', async () => {
    const validation = await validate.validateDigitalSpecimen(testDigitalSpecimen1, schema, 'https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52');
    assert.equal(validation.length, 1);
    assert.equal(validation[0].status, 'conformant');
  });
});

describe('Test 2', () => {
  let schema;
  before(async function() {
    schema = await createSchema();
  });
  it('Object validation should be nonconformant', async () => {
    const validation = await validate.validateDigitalSpecimen(testDigitalSpecimen2, schema, 'https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52');
    assert.equal(validation.length, 1);
    assert.equal(validation[0].status, 'nonconformant');
  });
});

describe('Test 3', () => {
  let schema;
  before(async function() {
    schema = await createSchema();
  });
  it('Object validation should be conformant', async () => {
    const validation = await validate.validateImage(testImageObject1, schema, 'https://doi.org/20.5000.1025/2211aa3a666ec72dbc52');
    assert.equal(validation.length, 1);
    assert.equal(validation[0].status, 'conformant');
  });
});

describe('Test 3', () => {
  let schema;
  before(async function() {
    schema = await createSchema();
  });
  it('Object validation should be conformant', async () => {
    const validation = await validate.validateImage(testImageObject2, schema, 'https://doi.org/20.5000.1025/2211aa3a666ec72dbc52');
    assert.equal(validation.length, 1);
    assert.equal(validation[0].status, 'nonconformant');
  });
});
