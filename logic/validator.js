const ShExUtil = require("@shexjs/util");
const ShExValidator = require("@shexjs/validator");
const ShExParser = require("@shexjs/parser");
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

console.log("ods_rdf_validator initialized");

async function validate(odsObject, id){
  console.log("validation function called!");

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
    const url = "http://172.28.128.8/objects/test.20.5000.1025/";
    const shParser = ShExParser.construct(url, {}, {});
    const parsedSchema = shParser.parse(SHEX_SCHEMA_TXT)
    if (parsedSchema.base === url) delete parsedSchema.base;
    var db = ShExUtil.rdfjsDB(loadedData);
    var validator = ShExValidator.construct(parsedSchema, db, { results: "api" });
    const result = validator.validate([{node: id, shape: "http://172.28.128.8/objects/test.20.5000.1025/OdsShape"}]);
    return result;
  });
}

module.exports = validate;
