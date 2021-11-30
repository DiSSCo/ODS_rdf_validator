const ShExUtil = require('@shexjs/util');
const ShExValidator = require('@shexjs/validator');
const n3 = require('n3');
const jsonld = require('jsonld');

function parseData(input) {
  // in case that the odsObject has a complex context which references another
  // context (['https://ex.org/external_context.jsonld', {'ns1':'https://example.org'}])
  // we have to expand the object first ins order to properly load all namespaces
  return jsonld
  .expand(input)
  .then(expanded => {
    if (!Array.isArray(expanded) || expanded.length !== 1) {
      throw TypeError('Unexpected format of the rdf graph');
    } else {
      if ('@graph' in expanded[0]) {
        return jsonld.toRDF(expanded[0]['@graph'], {
          format: 'application/n-quads'
        });
      } else {
        return jsonld.toRDF(expanded, {
          format: 'application/n-quads'
        });
      }
    }
  })
  .then(rdfData => {
    return new Promise(function(resolve, reject) {
      const loadedData = new n3.Store();
      const parser = new n3.Parser({
        baseIRI: 'http://github.com/hardistyar/openDS/ods-ontology/terms/',
        blankNodePrefix: '',
        format: 'text/turtle'
      });
      parser.parse(rdfData, function(error, triple, prefixes) {
        if (prefixes) {
          console.log('received prefix: ', prefixes);
        }
        if (error) {
          console.log('error parsing ' + error);
        } else if (triple) {
          loadedData.addQuad(triple);
        }
      });
      resolve(loadedData);
    });
  })
}

function validateDigitalSpecimen(input, shexSchema, id) {
  return parseData(input)
  .then(loadedData => {
    /*
    // Find the @id of the DigitalSpecimen object in the graph
    const subjects = loadedData.getSubjects(
      // predicate
      n3.DataFactory.namedNode(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      ),
      // object
      n3.DataFactory.namedNode(
        'http://github.com/hardistyar/openDS/ods-ontology/terms/DigitalSpecimen'
      )
    );
    if (subjects.length === 0) {
      throw 'No object of type ods:DigitalSpecimen found in the graph';
    }
    // TODO: handle case if more than 1 of type DigitalSpecimen provided
    // reject request or validate in a loop?
    const id = subjects[0].id;
    */
    const db = ShExUtil.rdfjsDB(loadedData);
    const validator = ShExValidator.construct(shexSchema, db, {
      results: 'api'
    });
    const result = validator.validate([{ node: id, shape: ShExValidator.start}]);
    return result;
  });
}

function validateImage(input, shexSchema, id) {
  return parseData(input)
  .then(loadedData => {
    const db = ShExUtil.rdfjsDB(loadedData);
    const validator = ShExValidator.construct(shexSchema, db, {
      results: 'api'
    });
    const result = validator.validate([{ node: id, shape: 'imagesShape'}]);
    return result;
  });
}

exports.validateDigitalSpecimen = validateDigitalSpecimen;
exports.validateImage = validateImage;
