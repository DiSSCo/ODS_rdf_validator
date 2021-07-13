# ODS_rdf_validator

## Description
This project provides a node.js-based micro service for semantic RDF validation of jsonld data against a defined schema based on the ODS ontology. The idea is to call this micro service from Cordra JavaScript during the lifecycle hooks (e.g. "beforeSchemaValidation"), and accordingly allow or reject the creation/update of the digital specimen.

## Install and run
For local development run `npm i` and `npm run test`. For production deployment run `npm i --only=prod` and run it as a service (e.g. with systemd). Customize the file located in config/config.js.

## Interaction with cordra
The file located in cordra_data/ODS_semantic_schema.json contains a template for a schema that can be created in Cordra. Afterwards, any Cordra object of type "ODS_semantic_schema" that will be created/updated, will be validated by the micro service beforehand (you can test it with the example curl command in the same folder). Make sure that the URL pointing to the micro service is correct in the javascript that is appended to the Cordra schema.
