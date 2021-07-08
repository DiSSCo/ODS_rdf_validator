# ODS_rdf_validator

Experimental project!

The goal is to have a semantic RDF validation of JSONld data that is sent to cordra, by using the Cordra JavaScript lifecycle hooks (e.g. "beforeSchemaValidation").

Run `npm run build` in order to transpile and bundle into one minified .js file. Upload this file to Cordra as an external JavaScript module as explained in the docs. Additionally upload the jsonld JavaScript library as UMD module. Then create the schema as the example given in cordra_data/ODS_semantic_schema. Then test the upload with of the example data with the curl command.

Current problems:
- Validation seems to work, but due to shex.js and jsonld dependencies the validation function can only be provided as a promise. The cordra lifecycle JavaScript hook doesn't seem to wait for the promise (only synchronous JavaScript implemented), therefore Cordra continues before the RDF validation is finished.
- The JavaScript execution of the bundled js fails from time to time for no apparent reason.
