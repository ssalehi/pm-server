const lib = require('../lib');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const error = require('../lib/errors.list');
const env = require('../env');
const path = require('path');
const app = require('../app');
const multer = require('multer');
const mongoose = require('mongoose');

let storage = multer.diskStorage({
  destination: env.uploadPath + path.sep,
  filename: (req, file, cb) => {
    cb(null, [req.params.username || req.user.username, file.mimetype.substr(file.mimetype.lastIndexOf('/') + 1)].join('.'));
  }
});
let upload = multer({storage: storage});


function apiResponse(className, functionName, adminOnly = false, reqFuncs = []) {
  let args = Array.prototype.slice.call(arguments, 4);
  let deepFind = function (obj, pathStr) {
    let path = pathStr.split('.');
    let len = path.length;
    for (let i = 0; i < len; i++) {
      if (typeof obj === 'undefined') {
        if (path[i - 1] && path[i - 1][0] === '?') {
          return undefined;
        } else {
          let err = new Error(`Bad request: request.${pathStr} is not found at '${path[i - 1]}'`);
          err.status = 400;
          throw(err);
        }
      }
      obj = obj[(path[i][0] === '?') ? path[i].substring(1) : path[i]];
    }
    return obj;
  };

  return (function (req, res) {
    lib.Agent.adminCheck(adminOnly, req.user, req.test)
      .then(rs => {
        if (adminOnly && rs.length < 1)
          return Promise.reject(error.adminOnly);
        else {
          let dynamicArgs = [];
          for (let i in reqFuncs)
            dynamicArgs.push((typeof reqFuncs[i] === 'function') ? reqFuncs[i](req) : deepFind(req, reqFuncs[i]));

          let allArgs = dynamicArgs.concat(args);

          for (cn in lib)
            lib[cn].test = req.test;

          let isStaticFunction = typeof lib[className][functionName] === 'function';
          let model = isStaticFunction ? lib[className] : new lib[className](req.test)
          return model[functionName].apply(isStaticFunction ? null : model, allArgs);
        }
      })
      .then(data => {
        res.status(200)
          .json(data);
      })
      .catch(err => {
        console.log(`${className}/${functionName}: `, req.app.get('env') === 'development' ? err : err.message);
        res.status(err.status || 500)
          .send(err.message || err);
      });
  });
}


router.get('/', function (req, res) {
  res.send('respond with a resource');
});
// Login API
router.post('/agent/login', passport.authenticate('local', {}), apiResponse('Person', 'afterLogin', false, ['user', () => true]));
router.post('/login', passport.authenticate('local', {}), apiResponse('Person', 'afterLogin', false, ['user']));
router.post('/loginCheck', apiResponse('Person', 'loginCheck', false, ['body.username', 'body.password']));
router.get('/logout', (req, res) => {
  req.logout();
  res.status(200).json('')
});
router.get('/agent/validUser', apiResponse('Person', 'afterLogin', false, ['user', () => true ]));

// Open Authentication API
router.get('/login/google', passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login', 'profile', 'email']}));
router.get('/login/google/callback', passport.authenticate('google', {
  successRedirect: '/login/oauth',
  failureRedirect: '/login'
}));

// Person (Customer/Agent) API
router.put('/user/register', apiResponse('Person', 'registration', false, ['body']));
router.post('/user/email/isExist', apiResponse('Person', 'emailIsExist', false, ['body']));
router.get('/user/activate/link/:link', apiResponse('Person', 'checkActiveLink', false, ['params.link']));
router.post('/user/auth/local/:link', apiResponse('Person', 'completeAuth', false, ['params.link', 'body']));
router.post('/user/auth/link', apiResponse('Person', 'sendActivationMail', false, ['body.email', 'body.is_forgot_mail']));
router.post('/profile/image/:pid', upload.single('image'), apiResponse('Person', 'setProfileImage', false, ['user.pid', 'params.pid', 'file']));
router.post('/profile/image/:username/:pid', upload.single('image'), apiResponse('Person', 'setProfileImage', true, ['user.pid', 'params.pid', 'file']));
router.get('/profile/image/:pid', apiResponse('Person', 'getProfileImage', false, ['params.pid']));
router.delete('/profile/image/:pid', apiResponse('Person', 'deleteProfileImage', false, ['user.pid', 'params.pid']));

router.put('/user', apiResponse('Person', 'insert', true, ['body']));
router.get('/user', apiResponse('Person', 'select', true));
// router.post('/user/:pid', apiResponse('Person', 'update', true, ['params.pid','body']));
router.post('/user/profile', apiResponse('Person', 'setProfile', false, ['user', 'body']));
router.get('/user/profile/:pid', apiResponse('Person', 'getPersonInfo', false, ['user.pid', 'params.pid']));
router.delete('/user/:pid', apiResponse('Person', 'delete', true, ['params.pid']));
router.put('/user/message', apiResponse('Person', 'socketHandler', false, ['body']));


router.put('/addAgent', apiResponse('Agent', 'save', false, ['']));
router.put('/addCustomer', apiResponse('Customer', 'save', false, ['']));

//product
router.get('/product', apiResponse('Product', 'getAllProducts', false, ['body']));
router.get('/product/:id', apiResponse('Product', 'getProduct', false, ['params.id']));
router.put('/product', apiResponse('Product', 'setProduct', true, ['body']));
router.post('/product', apiResponse('Product', 'setProduct', true, ['body']));
router.delete('/product/:id', apiResponse('Product', 'deleteProduct', true, ['params.id']));

// product tag
router.post('/product/tag', apiResponse('Product', 'setTag', true, ['body']));
router.delete('/product/tag/:id/:tagId', apiResponse('Product', 'deleteTag', true, ['params.id', 'params.tagId']));

// product color
router.post('/product/color', apiResponse('Product', 'setColor', true, ['body']));
router.delete('/product/color/:id/:colorId', apiResponse('Product', 'deleteColor', true, ['params.id', 'params.colorId']));

// product instance
router.put('/product/instance', apiResponse('Product', 'setInstance', true, ['body']));
router.post('/product/instance', apiResponse('Product', 'setInstance', true, ['body']));
router.delete('/product/instance/:id/:productColorId', apiResponse('Product', 'deleteInstance', true, ['params.id', 'params.productColorId']));
router.post('/product/instance/inventory', apiResponse('Product', 'setInventory', true, ['body']));
router.delete('/product/instance/inventory/:id/:productColorId/:warehouseId', apiResponse('Product', 'deleteInventory', true, ['params.id', 'params.productColorId','params.warehouseId']));

// product image
router.use('/product/image/:id/:colorId', function (req, res, next) {

  let destination;
  if (req.test)
    destination = env.uploadProductImagePath + path.sep + 'test' + path.sep + req.params.id + path.sep + req.params.colorId;
  else
    destination = env.uploadProductImagePath + path.sep + req.params.id + path.sep + req.params.colorId;

  let productStorage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      cb(null, [file.originalname, file.mimetype.substr(file.mimetype.lastIndexOf('/') + 1)].join('.'));
    }
  });
  let productUpload = multer({storage: productStorage});

  productUpload.single('file')(req, res, err => {
    if (!err)
      next()
  });

});
router.post('/product/image/:id/:colorId', apiResponse('Product', 'setColor', true, ['params.id', 'params.colorId', 'file']));

router.delete('/collection/:cid', apiResponse('Collection', 'deleteCollection', false, ['params']));
router.delete('/collection/product/:cid/:pid', apiResponse('Collection', 'deleteProductFromCollection', false, ['params']));
router.put('/collection/product/:cid/:pid', apiResponse('Collection', 'setProductToCollection', false, ['params']));
router.put('/collection', apiResponse('Collection', 'setCollection', false, ['body']));
router.get('/collection/products/:cid', apiResponse('Collection', 'getProductsFromCollection', false, ['params']));
router.get('/collection/:cid', apiResponse('Collection', 'getCollection', false, ['params.cid']));
router.get('/collection', apiResponse('Collection', 'getAllCollection', false, ['']));

module.exports = router;
