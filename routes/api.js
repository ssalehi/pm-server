const lib = require('../lib');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const error = require('../lib/errors.list');
const env = require('../env');
const path = require('path');
const app = require('../app');
const multer = require('multer');
const personModel = require('../lib/person.model');
const fs = require('fs');
const _const = require('../lib/const.list');
const mongoose = require('mongoose');
const model = require('../mongo/models.mongo');

let storage = multer.diskStorage({
  destination: env.uploadPath + path.sep,
  filename: (req, file, cb) => {
    cb(null, [req.params.username || req.user.username, file.mimetype.substr(file.mimetype.lastIndexOf('/') + 1)].join('.'));
  }
});
let upload = multer({storage: storage});

function apiResponse(className, functionName, adminOnly = false, reqFuncs = [], accessLevels) {
  let args = Array.prototype.slice.call(arguments, 5);
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
          throw (err);
        }
      }
      obj = obj[(path[i][0] === '?') ? path[i].substring(1) : path[i]];
    }
    return obj;
  };

  return (function (req, res) {
    (req.jwtToken ?
      personModel.jwtStrategy(req)
      :
      Promise.resolve())
      .then(() => {
        if (adminOnly)
          return lib.Agent.accessCheck(accessLevels, req.user, req.test);
        else
          return Promise.resolve();
      })
      .then(rs => {
        if (adminOnly && (!rs || rs.length < 1))
          return Promise.reject(error.adminOnly);
        else {
          let dynamicArgs = [];
          for (let i in reqFuncs)
            dynamicArgs.push((typeof reqFuncs[i] === 'function') ? reqFuncs[i](req) : deepFind(req, reqFuncs[i]));

          let allArgs = dynamicArgs.concat(args);

          for (cn in lib)
            lib[cn].test = req.test;

          let isStaticFunction = typeof lib[className][functionName] === 'function';
          let model = isStaticFunction ? lib[className] : new lib[className](req.test);
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
router.post('/app/login', apiResponse('Person', 'jwtAuth', false, ['body']));
router.post('/loginCheck', apiResponse('Person', 'loginCheck', false, ['body.username', 'body.password']));
router.get('/logout', (req, res) => {
  req.logout();
  res.status(200).json('')
});
router.get('/agent/validUser', apiResponse('Person', 'afterLogin', false, ['user', () => true]));
router.get('/validUser', apiResponse('Person', 'afterLogin', false, ['user']));

// Open Authentication API
router.get('/login/google', passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login', 'profile', 'email']}));
router.get('/login/google/callback', passport.authenticate('google', {
  successRedirect: '/login/oauth',
  failureRedirect: '/login/oauth'
}));
// router.post('/login/google/app', apiResponse('Person', 'appOauthLogin', false, ['body']));
// Person (Customer/Agent) API
router.put('/register', apiResponse('Customer', 'registration', false, ['body']));
router.post('/editUserBasicInfo', apiResponse('Customer', 'editUserBasicInfo', false, ['body', 'user.username']));
router.post('/changePassword', apiResponse('Customer', 'changePassword', false, ['body', 'user.username']));
router.post('/register/verify', apiResponse('Customer', 'verification', false, ['body.code', 'body.username']));
router.post('/register/resend', apiResponse('Customer', 'resendVerificationCode', false, ['body.username']));
router.post('/register/mobile', apiResponse('Customer', 'setMobileNumber', false, ['body']));
router.post('/user/address', apiResponse('Customer', 'setAddress', false, ['user', 'body']));
router.post('/user/guest/address', apiResponse('Customer', 'addGuestCustomer', false, ['body']));
router.post('/user/email/isExist', apiResponse('Person', 'emailIsExist', false, ['body']));
router.get('/user/activate/link/:link', apiResponse('Person', 'checkActiveLink', false, ['params.link']));
router.post('/user/auth/local/:link', apiResponse('Person', 'completeAuth', false, ['params.link', 'body']));
router.post('/user/auth/link', apiResponse('Person', 'sendActivationMail', false, ['body.email', 'body.is_forgot_mail']));
router.post('/profile/image/:pid', upload.single('image'), apiResponse('Person', 'setProfileImage', false, ['user.pid', 'params.pid', 'file']));
router.post('/profile/image/:username/:pid', upload.single('image'), apiResponse('Person', 'setProfileImage', true, ['user.pid', 'params.pid', 'file']));
router.get('/profile/image/:pid', apiResponse('Person', 'getProfileImage', false, ['params.pid']));
router.delete('/profile/image/:pid', apiResponse('Person', 'deleteProfileImage', false, ['user.pid', 'params.pid']));

router.put('/user', apiResponse('Person', 'insert', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.get('/user', apiResponse('Person', 'select', true, [], [_const.ACCESS_LEVEL.ContentManager]));
// router.post('/user/:pid', apiResponse('Person', 'update', true, ['params.pid','body']));
router.post('/user/profile', apiResponse('Person', 'setProfile', false, ['user', 'body']));
router.get('/user/profile/:pid', apiResponse('Person', 'getPersonInfo', false, ['user.pid', 'params.pid']));
router.delete('/user/:pid', apiResponse('Person', 'delete', true, ['params.pid'], [_const.ACCESS_LEVEL.ContentManager]));
router.put('/user/message', apiResponse('Person', 'socketHandler', false, ['body']));


router.put('/addAgent', apiResponse('Agent', 'save', false, ['']));
router.put('/addCustomer', apiResponse('Customer', 'save', false, ['']));


// Types
router.get('/productType', apiResponse('ProductType', 'getTypes', false, []));

// Colors
router.get('/color', apiResponse('Color', 'getColors', false, []));

// Dictionaries
router.delete('/dictionary/:dictionaryId', apiResponse('Dictionary', 'removeDictionary', false, ['params.dictionaryId']));
router.post('/dictionary/:dictionaryId', apiResponse('Dictionary', 'updateDictionary', false, ['params.dictionaryId', 'body']));
router.get('/dictionary', apiResponse('Dictionary', 'getDictionaries', false, []));
router.put('/dictionary', apiResponse('Dictionary', 'addDictionary', false, ['body']));

// Brands
router.get('/brand', apiResponse('Brand', 'getBrands', false, []));

// Warehouses
router.get('/warehouse/all', apiResponse('Warehouse', 'getAllWarehouses', false, []));
router.get('/warehouse', apiResponse('Warehouse', 'getWarehouses', false, []));

// Customer
router.get('/customer/balance', apiResponse('Customer', 'getBalanceAndPoint', false, ['user']));

// Customer shoesType
router.get('/customer/shoesType', apiResponse('Customer', 'getCustomerShoesType', false, ['user']));
router.post('/customer/shoesType', apiResponse('Customer', 'setCustomerShoesType', false, ['user', 'body']));

// Order
router.get('/orders', apiResponse('Order', 'getOrders', false, ['user']));
router.post('/order', apiResponse('Order', 'addToOrder', false, ['user', 'body']));
router.post('/order/delete', apiResponse('Order', 'removeFromOrder', false, ['user', 'body']));
router.post('/order/ticket/:type', apiResponse('Order', 'setManualTicket', true, ['params.type', 'body', 'user'], [_const.ACCESS_LEVEL.SalesManager, _const.ACCESS_LEVEL.ShopClerk]));

// api's used by offline system
router.post('/order/offline/verifyInvoice', apiResponse('Offline', 'verifyInvoice', false, ['body']));
router.post('/order/offline/verifyOnlineWarehouse', apiResponse('Offline', 'verifyOnlineWarehouse', false, ['body']));

// Wish List
router.post('/wishlist', apiResponse('Customer', 'AddToWishList', false, ['user', 'body']));
router.get('/wishlist', apiResponse('Customer', 'getWishListItems', false, ['user']));

// product
router.get('/product/:id', apiResponse('Product', 'getProduct', false, ['params.id']));
router.put('/product', apiResponse('Product', 'setProduct', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/product', apiResponse('Product', 'setProduct', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/product/:id', apiResponse('Product', 'deleteProduct', true, ['params.id'], [_const.ACCESS_LEVEL.ContentManager]));
router.get('/product/color/:product_id/:color_id/', apiResponse('Product', 'getProductByColor', false, ['params.product_id', 'params.color_id'], [_const.ACCESS_LEVEL.ContentManager]));

// product tag
router.post('/product/tag/:id', apiResponse('Product', 'setTag', true, ['params.id', 'body'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/product/tag/:id/:tagId', apiResponse('Product', 'deleteTag', true, ['params.id', 'params.tagId'], [_const.ACCESS_LEVEL.ContentManager]));

// product color
router.post('/product/color', apiResponse('Product', 'setColor', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/product/color/:id/:colorId', apiResponse('Product', 'removeColor', true, ['params.id', 'params.colorId'], [_const.ACCESS_LEVEL.ContentManager]));
router.get('/product/color/:id', apiResponse('Product', 'getProductColor', false, ['params.id']));

// product instance
router.get('/product/instance/:id/:piid', apiResponse('Product', 'getInstance', false, ['params.id', 'params.piid']));
router.put('/product/instance/:id', apiResponse('Product', 'setInstance', true, ['body', 'params.id'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/product/instance/:id/:pid', apiResponse('Product', 'setInstance', true, ['body', 'params.id', 'params.pid'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/product/instance/:id/:productColorId', apiResponse('Product', 'deleteInstance', true, ['params.id', 'params.productColorId'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/product/instance/inventory', apiResponse('Product', 'setInventory', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/product/instance/inventory/:id/:productColorId/:warehouseId', apiResponse('Product', 'deleteInventory', true, ['params.id', 'params.productColorId', 'params.warehouseId'], [_const.ACCESS_LEVEL.ContentManager]));

// product review
router.put('/product/review/:pid', apiResponse('Product', 'setReview', false, ['body', 'params.pid', 'user']));
router.delete('/product/review/:pid/:rid', apiResponse('Product', 'unSetReview', true, ['body', 'params', 'user']));

// product image
router.use('/product/image/:id/:colorId/:is_thumbnail', function (req, res, next) {

  let destination;
  if (req.test)
    destination = env.uploadProductImagePath + path.sep + 'test' + path.sep + req.params.id + path.sep + req.params.colorId;
  else
    destination = env.uploadProductImagePath + path.sep + req.params.id + path.sep + req.params.colorId;


  let productStorage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {

      const parts = file.originalname.split('.');

      if (!parts || parts.length !== 2) {

        cb(new Error('count not read file extension'));
      }
      else {
        cb(null, parts[0] + '-' + Date.now() + '.' + parts[1]);
      }
    }
  });
  let productUpload = multer({storage: productStorage});

  productUpload.single('file')(req, res, err => {
    if (!err)
      next()
  });

});
router.post('/product/image/:id/:colorId/:is_thumbnail', apiResponse('Product', 'setImage', true, ['params.id', 'params.colorId', 'params.is_thumbnail', 'file'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/product/image/:id/:colorId', apiResponse('Product', 'removeImage', true, ['params.id', 'params.colorId', 'body.angle'], [_const.ACCESS_LEVEL.ContentManager]));


// Collection
router.get('/collection/:cid', apiResponse('Collection', 'getCollection', false, ['params.cid']));
router.get('/collection/product/manual/:cid', apiResponse('Collection', 'getCollectionManualProducts', true, ['params.cid'], [_const.ACCESS_LEVEL.ContentManager]));
router.get('/collection/product/:cid', apiResponse('Collection', 'getCollectionProducts', false, ['params.cid']));
router.get('/collection/tag/:cid', apiResponse('Collection', 'getCollectionTags', true, ['params.cid'], [_const.ACCESS_LEVEL.ContentManager]));
router.get('/collection/type/:cid', apiResponse('Collection', 'getCollectionTypes', true, ['params.cid'], [_const.ACCESS_LEVEL.ContentManager]));

router.put('/collection', apiResponse('Collection', 'setCollection', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));

router.post('/collection/:cid', apiResponse('Collection', 'setCollection', true, ['body', 'params.cid'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/collection/product/:cid', apiResponse('Collection', 'setProductToCollection', true, ['params.cid', 'body.productId'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/collection/tag/:cid', apiResponse('Collection', 'setTagToCollection', true, ['params.cid', 'body.tagId'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/collection/type/:cid', apiResponse('Collection', 'setTypeToCollection', true, ['params.cid', 'body.typeId'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/collection/app/products', apiResponse('Collection', 'getProductsByPageAddress', false, ['body.address']));

router.delete('/collection/:cid', apiResponse('Collection', 'deleteCollection', true, ['params.cid'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/collection/type/:cid/:tid', apiResponse('Collection', 'deleteTypeFromCollection', true, ['params.cid', 'params.tid'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/collection/tag/:cid/:tid', apiResponse('Collection', 'deleteTagFromCollection', true, ['params.cid', 'params.tid'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/collection/product/:cid/:pid', apiResponse('Collection', 'deleteProductFromCollection', true, ['params.cid', 'params.pid'], [_const.ACCESS_LEVEL.ContentManager]));


// Page
router.get('/page/:id', apiResponse('Page', 'getPage', false, ['params.id']));
router.put('/page', apiResponse('Page', 'setPage', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/page/:id', apiResponse('Page', 'setPage', true, ['body', 'params.id'], [_const.ACCESS_LEVEL.ContentManager]));
router.delete('/page/:id', apiResponse('Page', 'deletePage', true, ['params.id'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/page', apiResponse('Page', 'getPageByAddress', false, ['body.address', () => false]));
router.post('/page/cm/preview', apiResponse('Page', 'getPageByAddress', true, ['body.address', () => true], [_const.ACCESS_LEVEL.ContentManager]));


// Search
router.post('/search/:className', apiResponse('Search', 'search', false, ['params.className', 'body', 'user']));
router.post('/suggest/:className', apiResponse('Search', 'suggest', false, ['params.className', 'body', 'user']));

// upload Data
router.use('/uploadData', function (req, res, next) {

  let destination;
  let fileName = Date.parse(new Date());
  if (req.test)
    destination = env.uploadExcelPath + 'test/' + fileName;
  else
    destination = env.uploadExcelPath + fileName;

  const rmPromise = require('rimraf-promise');
  rmPromise(env.uploadExcelPath)
    .then(res => {
      let productStorage = multer.diskStorage({
        destination,
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        }
      });
      let productUpload = multer({storage: productStorage});

      productUpload.single('file')(req, res, err => {
        if (!err)
          next()
      });
    }).catch(err => {
    });

});

router.post('/uploadData', apiResponse('Upload', 'excel', true, ['file'], [_const.ACCESS_LEVEL.ContentManager]));

// Cart
router.post('/cart/items', apiResponse('Order', 'getCartItems', false, ['user', 'body']));

// Coupon
router.post('/coupon/code/valid', apiResponse('Order', 'checkCouponValidation', false, ['user', 'body']));
router.post('/coupon/code/apply', apiResponse('Order', 'applyCouponCode', false, ['user', 'body']));

//ticket
router.put('/order/ticket', apiResponse('Order', 'setTicket', true, ['body'], _const.ACCESS_LEVEL.SalesManager));

// Customer Address
router.get('/customer/address', apiResponse('Customer', 'getAddresses', false, ['user']));

// Placement
router.put('/placement', apiResponse('Page', 'addPlacement', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/placement', apiResponse('Page', 'updatePlacements', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/placement/delete', apiResponse('Page', 'deletePlacement', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));
router.post('/placement/finalize', apiResponse('Page', 'finalizePlacement', true, ['body'], [_const.ACCESS_LEVEL.ContentManager]));

router.use('/placement/image/:pageId/:placementId', function (req, res, next) {
  req.is_new = req.params.placementId.toLowerCase() !== "null" && req.params.placementId.toLowerCase() !== "undefined" ? false : true;
  const plc_id = req.is_new ? new mongoose.Types.ObjectId() : req.params.placementId;

  const destination = env.uploadPlacementImagePath + (req.test ? path.sep + 'test' : '')
    + path.sep + req.params.pageId + path.sep + plc_id;

  req.new_placement_id = plc_id;

  let placementStorage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });

  let placementUpload = multer({storage: placementStorage});
  placementUpload.single('file')(req, res, err => {
    if (!err) {
      next();
    }
  });
})
router.post('/placement/image/:pageId/:placementId', apiResponse('Page', 'addImage', true, ['params', 'body', 'file', 'is_new', 'new_placement_id'], [_const.ACCESS_LEVEL.ContentManager]));

// checkout
router.post('/checkout', apiResponse('Order', 'checkoutCart', false, ['user', 'body.cartItems', 'body.order_id', 'body.address', 'body.customerData', 'body.transaction_id', 'body.used_point', 'body.used_balance', 'body.total_amount', 'body.is_collect']));
module.exports = router;
