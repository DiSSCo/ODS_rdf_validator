const ShExWriter = require('@shexjs/writer');
const ShExParser = require('@shexjs/parser');
const fetch = require('node-fetch');

const SPARQL_URL = "http://dissco-mf.bgbm.org:8282/proxy/wdqs/bigdata/namespace/wdq/sparql?query=PREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwikibase.svc%2Fentity%2F%3E%0A%20PREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwikibase.svc%2Fprop%2Fdirect%2F%3E%0A%20%0A%20SELECT%20%3Fsection%20%3FsectionLabel%20%3Fitem%20%3FitemLabel%20%3FitemDescription%20%3Fexample%20%3FdataType%20%3Fmin%20%3Fmax%20WHERE%20%7B%0A%20%20%20%23the%20type%20to%20export%20is%20ODStype1802%0A%20%20%20BIND(wd%3AQ41%20as%20%24type).%0A%20%20%20%0A%20%20%20%7B%0A%20%20%20%20%20%23get%20all%20of%20the%20statements%20that%20are%20not%20sections%0A%20%20%20%3Ftype%20p%3AP44%20%3Fstatement.%0A%20%20%20%20%3Fstatement%20ps%3AP44%20%3Fitem.%0A%20%20%20%20%3Fstatement%20pqv%3AP45%2Fwikibase%3AquantityAmount%20%3Forder.%0A%20%20%20%20MINUS%20%7B%3Fitem%20wdt%3AP1%20wd%3AQ39%7D.%0A%20%20%7DUNION%7B%0A%20%20%20%20%23get%20all%20of%20the%20sections%0A%20%20%20%20%3Ftype%20p%3AP44%20%3Fstatement.%0A%20%20%20%20%3Fstatement%20ps%3AP44%20%3Fsection.%0A%20%20%20%20%3Fstatement%20pqv%3AP45%2Fwikibase%3AquantityAmount%20%3Forder.%0A%20%20%20%20%3Fsection%20wdt%3AP1%20wd%3AQ39.%0A%20%20%0A%20%20%20%20%23get%20the%20items%20of%20the%20section%0A%20%20%20%20%3Fitem%20wdt%3AP4%20%3Fsection.%0A%20%20%7D%0A%20%20%23additional%20optional%20properties%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP18%20%3Fexample%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP10%20%3FdataType%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP37%20%3Fmin%7D%0A%20%20OPTIONAL%20%7B%3Fitem%20wdt%3AP38%20%3Fmax%7D%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22de%2Cen%22.%20%7D%0A%20%20%0A%7DORDER%20BY%20%3Forder&accept=application/json";

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

const createSchema = () => {
  return fetch(SPARQL_URL)
    .then(res => res.json())
    .then(queryResult => {
      const schema = {
        type: 'Schema',
        start: 'OdsShape',
        shapes: []
      }
      const odsShape = {
        id: 'OdsShape',
        type: 'Shape',
        expression: {
          type: 'EachOf',
          expressions: []
        }
      }

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
        const sectionShape = {
          id: shapeName,
          type: 'Shape',
          expression: {
            type: 'EachOf',
            expressions: []
          }
        }

        // get bindings belonging to this section
        bindingsWithSection.filter(
          binding => binding.sectionLabel.value === sectionLabel
        ).forEach(binding => {
          const expression = {
            type: 'TripleConstraint',
            predicate: prefixes.ods + binding.itemLabel.value,
            valueExpr: {
              type: 'NodeConstraint',
              // set string per default
              datatype: 'http://www.w3.org/2001/XMLSchema#string'
            },
          //  min: 0,
          //  max: 1
          }
          // handle datatype
          if(binding.dataType){
            const datatype = replacePrefix(binding.dataType.value);
            expression.valueExpr.datatype = datatype;
          }
          if(binding.min){
            expression.valueExpr.mininclusive = binding.min.value;
          }
          if(binding.max){
            expression.valueExpr.maxinclusive = binding.max.value;
          }
          sectionShape.expression.expressions.push(expression);
        });

        const expression = {
          type: 'TripleConstraint',
          predicate: prefixes.ods + sectionLabel,
          valueExpr: shapeName
        }
        odsShape.expression.expressions.push(expression);
        schema.shapes.push(sectionShape);
      });

    schema.shapes.push(odsShape);
    return schema;
  });
};


createSchema().then(schema => {
  // serialize the SHEX schema into a string
  const writer = ShExWriter(null, {prefixes:prefixes});
  writer.writeSchema(schema, function(x,result){
    if(result !== undefined){
      console.log("serialized schema:");
      console.log(result);
    }
  })
})
