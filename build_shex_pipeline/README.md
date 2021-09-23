# Building the shex schema pipeline

## Run
After installing the dependencies run with `npm run buildshex`

## About
Fetches the data model from the dissco modeling framework via SPARQL query. Then parses the fetched JSON data and creates a shex schema based on this.

Already supported in building of Shex schema:
- different ODS sections based on `sectionLabel`
- different datatypes (should be xsd:)

To-Do:
- how to make constraints optional
