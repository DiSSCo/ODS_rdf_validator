const ShExWriter = require('@shexjs/writer');
const ShExParser = require('@shexjs/parser');
const fetch = require('node-fetch');
const config = require('../config/config');

const SPARQL_URL = "http://dissco-mf.bgbm.org:8282/proxy/wdqs/bigdata/namespace/wdq/sparql?query=PREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwikibase.svc%2Fentity%2F%3E%0APREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwikibase.svc%2Fprop%2Fdirect%2F%3E%0A%0ASELECT%20%3Fsection%20%3FsectionLabel%20%3Fitem%20%3FitemLabel%20%3FitemDescription%20%3Fexample%20%3FdataType%20%3Fmin%20%3Fmax%20%3Fmandatory%20WHERE%20%7B%0A%20%20%23the%20type%20to%20export%20is%20ODStype1802%0A%20%20BIND(wd%3AQ41%20as%20%24type).%0A%20%20%0A%20%20%7B%0A%20%20%20%20%23get%20all%20of%20the%20statements%20that%20are%20not%20sections%0A%20%20%20%20%3Ftype%20p%3AP44%20%3Fstatement.%0A%20%20%20%20%3Fstatement%20ps%3AP44%20%3Fitem.%0A%20%20%20%20%3Fstatement%20pqv%3AP45%2Fwikibase%3AquantityAmount%20%3Forder.%0A%20%20%20%20MINUS%20%7B%3Fitem%20wdt%3AP1%20wd%3AQ39%7D.%0A%20%20%7DUNION%7B%0A%20%20%20%20%23get%20all%20of%20the%20sections%0A%20%20%20%20%3Ftype%20p%3AP44%20%3Fstatement.%0A%20%20%20%20%3Fstatement%20ps%3AP44%20%3Fsection.%0A%20%20%20%20%3Fstatement%20pqv%3AP45%2Fwikibase%3AquantityAmount%20%3Forder.%0A%20%20%20%20%3Fsection%20wdt%3AP1%20wd%3AQ39.%0A%20%20%0A%20%20%20%20%23get%20the%20items%20of%20the%20section%0A%20%20%20%20%3Fitem%20p%3AP4%20%3FsectionStatement.%0A%20%20%20%20%3FsectionStatement%20ps%3AP4%20%3Fsection.%0A%20%20%20%20OPTIONAL%7B%0A%20%20%20%20%20%20%3FsectionStatement%20pqv%3AP9%2Fwikibase%3AquantityAmount%20%3FmandatoryInternal.%0A%20%20%20%20%20%20%0A%20%20%20%20%7D%0A%20%20%7D%0A%20%20%23additional%20optional%20properties%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP18%20%3Fexample%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP10%20%3FdataType%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP37%20%3Fmin%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP38%20%3Fmax%7D%0A%20%20BIND(IF(BOUND(%3FmandatoryInternal)%2C%3FmandatoryInternal%2C%220%22)%20AS%20%3Fmandatory)%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22de%2Cen%22.%20%7D%0A%20%20%0A%7DORDER%20BY%20%3Forder&accept=application/json";

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
  return fetch(SPARQL_URL)
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
};

createSchema().then(schema => {
  // serialize the SHEX schema into a string
  const writer = ShExWriter(null, {prefixes: prefixes});
  return new Promise(function(resolve, reject) {
    writer.writeSchema(schema, function(x, resultSchema){
      if(resultSchema !== undefined){
        console.log("result yay");
        resolve(resultSchema)
      }
    });
  });
}).then(schemaString => {
  console.log("schemaString: ", schemaString);
  const cnf = config.shexUpload;
  const objectUrl = cnf.cordraBaseUrl + 'objects/' + cnf.objectId;
  const jsondata = JSON.stringify({
    attributes:{
      content: {
        id: cnf.objectId,
        name: 'SemanticODSShexSchema',
        description: 'Shex schema as string retrievable via: ' + objectUrl + '?jsonPointer=/shexSchema',
        shexSchema: schemaString
      }
    }
    //To-Do: Alternatively upload as file (need to b64 encode schemaString)
    /*elements: [
    {
      id: "file",
      type: "text/plain",
      attributes: {
        filename: "helloworld.txt"
      }
    }
  ]*/
  });
  return fetch(cnf.cordraBaseUrl + '/doip?targetId=' + cnf.objectId + '&operationId=0.DOIP/Op.Update', {
    method: 'POST',
    body: jsondata,
    headers: {
      'Content-Type': 'application/json',
       'Authorization': 'Basic ' + Buffer.from(cnf.username + ":" + cnf.password).toString('base64')
    }
  })
}).then(response => {
  if(response.status === 200){
    console.log('Successfully uploaded new shexSchema to ' + config.shexUpload.objectId)
  }
});
