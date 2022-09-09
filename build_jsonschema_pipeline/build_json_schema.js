const fetch = require('node-fetch');
const FormData = require('form-data');
const https = require('https');
const config = require('../config/config');

const SPARQL_QUERY_BASE_URL = 'http://modelling.dissco.tech/proxy/wdqs/bigdata/namespace/wdq/sparql?query=';
//const GET_SPARQL_QUERY_URL = 'https://modelling.dissco.tech/w/index.php?title=Project:Type_Complete_Query&action=raw';
// Use for ImageObject (attention: hardcoded EntityId Q45 further below)
const GET_TYPES_SPARQL_QUERY_URL = 'https://modelling.dissco.tech/w/index.php?title=Project:List_Types_Query&action=raw';
const GET_PROPERTIES_SPARQL_QUERY_URL = 'https://modelling.dissco.tech/w/index.php?title=Project:Secondary_Type_Query&action=raw';

const VERSION = '0.1.0'

const prefixes = {
  ods: 'http://github.com/hardistyar/openDS/ods-ontology/terms/',
  xsd:'http://www.w3.org/2001/XMLSchema#'
}


function buildConstraintExpression(schema, binding){
  const schemaPart = {}
  let conceptName;
  if(binding.conceptName){
    conceptName = binding.conceptName.value;
  } else {
    conceptName = binding.itemLabel.value
  }
  schema.properties[conceptName] = schemaPart;
  let datatype = 'string';
  if(binding.dataType){
    datatype = binding.dataType.value.replace('xsd:','');
  }
  schemaPart.type = datatype;
  // handle minimum allowed value
  if(binding.min){
    schemaPart.minimum = binding.min.value;
  }
  // handle maximum allowed value
  if(binding.max){
    schemaPart.maximum = binding.max.value;
  }
  // handle mandatory
  if(binding.mandatory){
    if(parseInt(binding.mandatory.value) === 1){
      schema.required.push(conceptName)
    }
  }
}

async function buildConstraintsFromQuery(queryResult, schema){
    const bindingsWithoutSection = queryResult.results.bindings.filter(
      binding => binding.sectionLabel === undefined
    );
    const bindingsWithSection = queryResult.results.bindings.filter(
      binding => binding.sectionLabel !== undefined
    );

    // get unique section names
    const sectionLabels = new Set(
      bindingsWithSection.map(binding => binding.sectionLabel.value)
    );

    sectionLabels.forEach(sectionLabel => {
      const sectionObject = {
        type: 'object',
        required: [],
        properties: {}
      }


      // get bindings belonging to this section and create constraints
      bindingsWithSection.filter(
        binding => binding.sectionLabel.value === sectionLabel
      ).forEach(binding => {
        buildConstraintExpression(sectionObject, binding)
      });

      schema.properties[sectionLabel] = sectionObject;
    });

    // now handle bindings which are not associated to a specific section (= top level)
    const promises = bindingsWithoutSection.map(binding => {
      buildConstraintExpression(schema, binding)
    });
    await Promise.all(promises);
    return schema
  }

async function fetch_data(sparqlQuery, typeUrl){
  const response = await fetch(sparqlQuery)
  .then(response => response.text())
  .then(query_string => {
    if(typeUrl){
      query_string = query_string.replaceAll('wd:Q45', '<' + typeUrl + '>')
    }
    let queryUrl = SPARQL_QUERY_BASE_URL + encodeURIComponent(query_string);
    return fetch(queryUrl, {
      headers: {
        'accept':'application/json'
      }
    });
  });
  return await response.json();
}

async function createSchema(typeUrl, conceptName) {
  const data = await fetch_data(GET_PROPERTIES_SPARQL_QUERY_URL, typeUrl);
  const schema = {
    '$schema': 'http://json-schema.org/draft-04/schema',
    '$id': 'http://nsidr.org/schemas/' + VERSION + '/' + conceptName,
    'type': 'object',
    'required': [],
    'properties': {}
  }
  await buildConstraintsFromQuery(data, schema);//.then(() =>
  // here we manually define that the imagesShape section should be optional
  // To-Do: How to define this in Wikibase?
  /*
  const imageShapeConstraintExpression = odsShape.expression.expressions.find(
    e => prefixes.ods + 'images' === e.predicate
  );
  imageShapeConstraintExpression.min = 0;
  */
  return schema;
//});
}

fetch_data(GET_TYPES_SPARQL_QUERY_URL).then(result => {
    result.results.bindings.forEach(binding => {
      const typeUrl = binding.type.value;
      const conceptName = binding.conceptName.value;
        createSchema(typeUrl, conceptName).then(schema => {
        console.log('Schema for ' + binding.typeLabel.value)
          console.dir(schema, {depth: null});
          // Upload the shex schema as a payload via the Cordra REST API
          // See: https://www.cordra.org/documentation/api/rest-api.html#create-object-by-type
          const cnf = config.shexUpload;
          const objectUrl = 'https://' + cnf.cordraHost + '/objects/' + cnf.objectId;
          const objectContent = JSON.stringify({
            id: cnf.objectId,
            name: 'SemanticODSShexSchema',
            description: 'Shex schema as text retrievable via: ' + objectUrl + '?payload=ods_schema'
          });
    })
})


  /*
  const form = new FormData();
  form.append('content',  Buffer.from(objectContent));
  form.append('ods_schema', Buffer.from(schemaString), {
    filename: 'ods_schema.shex',
    contentType: 'text/plain'
  });

  const request = https.request({
    method: 'PUT',
    host: cnf.cordraHost,
    path: '/objects/' + cnf.objectId,
    auth: cnf.username + ':' + cnf.password,
    headers: form.getHeaders()
  }, response => {
    response.on('data', d => {
      if(response.statusCode === 200) {
        console.log('Successfully updated object ' + cnf.objectId +' with latest shex schema');
      } else {
        console.log('An error occurred during schema upload: ', response.statusCode);
      }
      process.stdout.write(d)
    });
  });

  request.on('error', error => {
    console.error('An error occurred during schema upload: ', error);
  })
  const result = form.pipe(request);
  request.end();*/
});
