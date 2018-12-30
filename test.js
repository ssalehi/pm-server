
const moment = require('moment');

var main = () => {


  let m1 = moment();

  let m2 = moment('2018-12-23');

  console.log('-> ', m1);
  console.log('-> ', m2);

  console.log('-> ', m1.isBefore(m2));
  console.log('-> ', m2.isBefore(m1));

}
main()
