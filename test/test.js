const assert = require('assert');
const validate = require("../logic/validator");
const https = require('https');
const ShExParser = require('@shexjs/parser');

const config = require('../config/config');

const testObject ={"id":"test.20.5000.1025/testId1","typeName":"ODStype1804","@context":{"ods":"http://github.com/hardistyar/openDS/ods-ontology/terms/"},"@graph":[{"@id":"https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52","ods:midsLevel":[{"@value":1}],"ods:name":[{"@value":"Elophila nymphaeata (Linnaeus, 1758)"}],"ods:physicalSpecimenId":[{"@value":"NHMUK010517563"}]}]}

const createSchema = () => {
  const agent = new https.Agent({
    rejectUnauthorized: !config.selfSignedCertificate
  });
  return fetch(config.schemaUrl, { agent })
  .then(res => res.text())
  .then(schemaTxt => {
    const shParser = ShExParser.construct();
    const parsedSchema = shParser.parse(schemaTxt)
    return parsedSchema;
  });
}

describe('Test 1', () => {
  let schema;
  before(async function() {
    schema = await createSchema();
  });
 it('Object validation should be conformant', async () => {
    const validation = await validate(
      testObject,
      "https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52",
      schema
    );
    console.log(validation);
    console.log(validation[0].appinfo.errors);
    assert.equal(validation.length, 1);
    assert.equal(validation[0].status, 'conformant');

    testObject["@graph"][0]["ods:midsLevel"][0]["@value"] = "one"
    describe('Test 2', () => {
     it('Object validation should be nonconformant', async () => {
        const validation = await validate(
          testObject,
          "https://doi.org/20.5000.1025/ae88bb3a666ec72dbc52",
          schema
        );
        console.log(validation);
        assert.equal(validation.length, 1);
        assert.equal(validation[0].status, 'nonconformant');
      });
    });

  });
});
