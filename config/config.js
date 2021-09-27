const config = {
  port: 3000,
  schemaUrl: "http://URL_TO_SHEX_SCHEMA",
  shexUpload: {
    username: '<USERNAME>',
    password: '<PASSWORD>',
    objectId: '<PREFIX/SUFFIX>',
    // cordraBaseUrl must end with a slash
    cordraHost: '<CORDRA_HOST>'
  }
}
module.exports = config;
