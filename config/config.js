const config = {
  port: 3000,
  schemaUrl: "http://URL_TO_SHEX_SCHEMA",
  shexUpload: {
    username: '<USERNAME>',
    password: '<PASSWORD>',
    objectId: '<PREFIX/SUFFIX>',
    // cordraBaseUrl must end with a slash
    cordraBaseUrl: '<https://CORDRA_BASE_URI>'
  }
}
module.exports = config;
