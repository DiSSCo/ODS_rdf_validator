const ShExWriter = require('@shexjs/writer');
const ShExParser = require('@shexjs/parser');
const fetch = require('node-fetch');
const FormData = require('form-data');
const https = require('https');
const config = require('../config/config');


const SPARQL_QUERY_BASE_URL = 'http://dissco-mf.bgbm.org:8282/proxy/wdqs/bigdata/namespace/wdq/sparql?query=';
const GET_SPARQL_QUERY_URL = 'http://dissco-mf.bgbm.org:8181/w/index.php?title=Project:Type_Complete_Query&action=raw';

const prefixes = {
  ods: "http://github.com/hardistyar/openDS/ods-ontology/terms/",
  xsd:"http://www.w3.org/2001/XMLSchema#"
}

function replacePrefix(string){
  for (let prefix in prefixes){
    const pre = prefix + ':';
    if(string.startsWith(pre)){
      const suffix = string.substr(pre.length);
      return prefixes[prefix] + suffix;
    }
  };
  // if no matching prefix found return unchanged
  return string;
}

function createShape(name){
  return {
    id: name,
    type: 'Shape',
    expression: {
      type: 'EachOf',
      expressions: []
    }
  }
}

function createConstraintExpression(predicate){
  return {
    type: 'TripleConstraint',
    predicate: predicate,
    valueExpr: {
      type: 'NodeConstraint',
      // set string per default
      datatype: 'http://www.w3.org/2001/XMLSchema#string'
    }
  }
}

function buildConstraintExpression(binding){
  const predicate = prefixes.ods + binding.itemLabel.value;
  const constraintExpression = createConstraintExpression(predicate);
  // handle datatype
  if(binding.dataType){
    const datatype = replacePrefix(binding.dataType.value);
    constraintExpression.valueExpr.datatype = datatype;
  }
  // handle minimum allowed value
  if(binding.min){
    constraintExpression.valueExpr.mininclusive = binding.min.value;
  }
  // handle maximum allowed value
  if(binding.max){
    constraintExpression.valueExpr.maxinclusive = binding.max.value;
  }
  // handle mandatory
  if(binding.mandatory){
    if(parseInt(binding.mandatory.value) === 0){
      constraintExpression.min = 0;
      constraintExpression.max = 1;
    }
  }
  return constraintExpression;
}

const createSchema = () => {
  return fetch(GET_SPARQL_QUERY_URL)
  .then(response => response.text())
  .then(query_string => {
    let queryUrl = SPARQL_QUERY_BASE_URL + encodeURIComponent(query_string);
    queryUrl += '&accept=application/json';
    return fetch(queryUrl);
  })
  .then(res => res.json())
  .then(queryResult => {
    const schema = {
      type: 'Schema',
      start: 'OdsShape',
      shapes: []
    }
    const odsShape = createShape('OdsShape');

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
      const shapeName = sectionLabel + 'Shape';
      const sectionShape = createShape(shapeName)

      // get bindings belonging to this section and create constraints
      bindingsWithSection.filter(
        binding => binding.sectionLabel.value === sectionLabel
      ).forEach(binding => {
        const constraintExpression = buildConstraintExpression(binding)
        sectionShape.expression.expressions.push(constraintExpression);
      });

      const predicate = prefixes.ods + sectionLabel;
      const constraintExpression = createConstraintExpression(predicate);
      // this defines the relation between shapes e.g. ods:images <imagesShape>
      constraintExpression.valueExpr = shapeName;
      odsShape.expression.expressions.push(constraintExpression);
      schema.shapes.push(sectionShape);
    });

    schema.shapes.push(odsShape);

    // now handle bindings which are not associated to a specific section (= top level)
    bindingsWithoutSection.forEach(binding => {
      const constraintExpression = buildConstraintExpression(binding)
      odsShape.expression.expressions.push(constraintExpression);
    });

    // here we manually define that the imagesShape section should be optional
    // To-Do: How to define this in Wikibase?
    const imageShapeConstraintExpression = odsShape.expression.expressions.find(
      e => prefixes.ods + 'images' === e.predicate
    );
    imageShapeConstraintExpression.min = 0;

    return schema;
  });
}

createSchema().then(schema => {
  // serialize the SHEX schema into a string
  const writer = ShExWriter(null, {prefixes: prefixes});
  return new Promise(function(resolve, reject) {
    writer.writeSchema(schema, function(x, resultSchema){
      if(resultSchema !== undefined){
        resolve(resultSchema)
      }
    });
  });
}).then(schemaString => {
  console.log(schemaString);
  // Upload the shex schema as a payload via the Cordra REST API
  // See: https://www.cordra.org/documentation/api/rest-api.html#create-object-by-type
  const cnf = config.shexUpload;
  const objectUrl = 'https://' + cnf.cordraHost + '/objects/' + cnf.objectId;
  const objectContent = JSON.stringify({
    id: cnf.objectId,
    name: 'SemanticODSShexSchema',
    description: 'Shex schema as text retrievable via: ' + objectUrl + '?payload=ods_schema'
  });

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
  request.end();
});
