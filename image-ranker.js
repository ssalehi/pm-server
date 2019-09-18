
const db = require('./mongo/index');
const models = require('./mongo/models.mongo');
// const fs = require('fs');
const mongoose = require('mongoose');


main = async () => {

  try {
    await db.dbIsReady();
  }
  catch (err) {
    process.exit();
  }

  await modelIsReady();


  try {
    let prodcuts = (await getProducts());

    for (let i = 0; i < prodcuts.length; i++) {

      const product = prodcuts[i].toObject();

      for (let j = 0; j < product.colors.length; j++) {

        const color = product.colors[j];

        if (color.image.angles.length < 2)
          continue;

          const temp = color.image.angles[0];
          color.image.angles[0] = color.image.angles[1];
          color.image.angles[1] = temp;


          await models()['Product'].update({

            _id: mongoose.Types.ObjectId(product._id),
            'colors._id': mongoose.Types.ObjectId(color._id),
          }, {
            $set: {
              'colors.$.image.angles': color.image.angles
            }
    
          });


      }




    }

    process.exit(0);

  }
  catch (error) {
    console.log('-> ', error);
    process.exit(1);
    return null;
  }



}


getProducts = async (articles) => {
  try {

    return models()['Product'].find({});
  } catch (err) {
    console.log('-> could not get products', err);
  }
}

modelIsReady = async () => {
  return new Promise((resolve, reject) => {

    getModels = () => {

      setTimeout(() => {
        if (!models() || models().length)
          getModels();
        else
          resolve();
      }, 500);

    }
    getModels();
  })

}

main();

