const ShExUtil = require("@shexjs/util");
const ShExValidator = require("@shexjs/validator");
const n3 = require("n3");
const jsonld = require("jsonld");

const SHEX_SCHEMA_TXT = "PREFIX ods: <http://github.com/hardistyar/openDS/ods-ontology/terms/>\n"
+"PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n"
+"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"

+"start = <OdsShape>  # Issue validation starts with <IssueShape>\n"
+"<OdsShape> {\n"
+"ods:midsLevel xsd:integer,\n"
+"ods:name xsd:string,\n"
+"ods:physicalSpecimenId xsd:string}";

async function validate(odsObject, id, shexSchema){
  return jsonld.toRDF(odsObject, {format: 'application/n-quads'})
  .then(rdfData => {
    return new Promise(function (resolve, reject) {
      const loadedData = new n3.Store();
      const parser = new n3.Parser({
        baseIRI: "http://github.com/hardistyar/openDS/ods-ontology/terms/",
        blankNodePrefix: "",
        format: "text/turtle"
      });
      parser.parse(rdfData, function (error, triple, prefixes) {
        if (prefixes) {
          console.log("received prefix: ", prefixes)
        }
        if (error) {
          console.log("error parsing " + error)
        } else if (triple) {
          loadedData.addQuad(triple);
        }
      });
      resolve(loadedData);
    });
  }).then(loadedData => {
    const db = ShExUtil.rdfjsDB(loadedData);
    const validator = ShExValidator.construct(shexSchema, db, { results: "api" });
    const result = validator.validate([{node: id, shape: "OdsShape"}]);
    return result;
  });
}

module.exports = validate;
