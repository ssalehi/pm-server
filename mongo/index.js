const prod =  require('./prod.db');
const test = require('./test.db');

module.exports= {
  mongoose: prod.mongoose,
  mongoose_test: test.mongoose_test,
  Schema: prod.Schema,
  TestSchema: test.Schema
};

