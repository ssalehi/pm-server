
const moment = require('moment');

var main = async () => {


  let m1 = moment();

  let m2 = moment('2018-12-23');

  console.log('-> ', m1);
  console.log('-> ', m2);

  console.log('-> ', m1.isBefore(m2));
  console.log('-> ', m2.isBefore(m1));

  try{
    await prom();
    
  }catch(err){
   console.log('-> out of its scope',  err); 
  }
}

let prom = () => {
  try {

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('oh ...'))
      }, 1000);
    });


  } catch (err) {
    console.log('-> inside its scope', err);
  }
}

main()


