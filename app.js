const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const https = require('https');

const ShExParser = require("@shexjs/parser");

const config = require('./config/config');
const indexRouter = require('./routes/index');

const app = express();

app.use(morgan('common'));
app.use(express.json());
app.use(cookieParser());

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.json('error');
});

fetch(config.schemaUrl)
.then(res => res.text())
.then(schemaTxt => {
  const shParser = ShExParser.construct();
  const parsedSchema = shParser.parse(schemaTxt);
  app.locals.shexSchema = parsedSchema;
});

module.exports = app;
