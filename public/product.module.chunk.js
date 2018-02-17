webpackJsonp(["product.module"],{

/***/ "../../../../../src/app/admin/product/all-products.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".card-view {\r\n    margin: 10px;\r\n    -webkit-box-shadow: 10px 10px 80px grey;\r\n            box-shadow: 10px 10px 80px grey;\r\n}\r\n", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/all-products.component.html":
/***/ (function(module, exports) {

module.exports = "<div fxLayout=\"row\" class=\"row\">\r\n  <button mat-fab color=\"accent\" (click)=\"openForm()\">\r\n    <mat-icon aria-label=\"add new organization\">add</mat-icon>\r\n  </button>\r\n</div>\r\n<div *ngFor=\"let r of rows\">\r\n  <div fxLayout=\"row\" fxLayout.sm=\"column\" fxLayout.xs=\"column\" fxLayoutAlign=\"start start\" fxLayoutAlign.sm=\"center center\" fxLayoutAlign.xs=\"center center\" class=\"row\">\r\n    <div fxFlex=\"20\" *ngFor=\"let p of r\" class=\"outer-card\">\r\n      <mat-card class=\"card-view\">\r\n        <div style=\"text-align: center\">\r\n          <img mat-card-image  style=\"width: 75%\" src=\"{{p.imgUrl}}\">\r\n        </div>\r\n        <hr>\r\n        <mat-card-content>\r\n          <div dir=\"rtl\" style=\"font-weight: bold; font-family: 'B Koodak'\">\r\n            {{p.name}}\r\n          </div>\r\n          <div dir=\"rtl\" style=\"font-family: 'B Koodak'\">\r\n            <span>قیمت پایه :</span>\r\n            {{p.base_price}}\r\n          </div>\r\n        </mat-card-content>\r\n        <mat-card-actions>\r\n          <button mat-icon-button (click)=\"openView(p.id)\" color=\"primary\">\r\n            <mat-icon aria-label=\"view\">visibility</mat-icon>\r\n          </button>\r\n          <button mat-icon-button (click)=\"openForm(p.id)\" color=\"accent\">\r\n            <mat-icon aria-label=\"edit\">edit</mat-icon>\r\n          </button>\r\n          <button mat-icon-button (click)=\"deleteProduct(p.id)\" color=\"warn\">\r\n            <mat-icon aria-label=\"delete\">delete</mat-icon>\r\n          </button>\r\n        </mat-card-actions>\r\n      </mat-card>\r\n    </div>\r\n  </div>\r\n</div>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/product/all-products.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AllProductsComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__shared_services_http_service__ = __webpack_require__("../../../../../src/app/shared/services/http.service.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var AllProductsComponent = /** @class */ (function () {
    function AllProductsComponent(httpService, router) {
        this.httpService = httpService;
        this.router = router;
        this.products = [
            {
                imgUrl: '../../../../assets/pictures/product-small/11.jpeg',
                name: 'کفش پیاده روی نایک',
                base_price: '155000',
            },
            {
                imgUrl: '../../../../assets/pictures/product-small/12.jpeg',
                name: 'کفش ورزشی آدیداس',
                base_price: '270000',
            },
        ];
        this.selectedId = null;
        this.rows = [];
    }
    AllProductsComponent.prototype.ngOnInit = function () {
        // TODO: should get products with calling a api
        this.searching();
    };
    AllProductsComponent.prototype.searching = function () {
        this.alignRow();
    };
    AllProductsComponent.prototype.alignRow = function () {
        // TODO: should be multiple per row not all in one row - after paginator added
        // TODO: should get products with calling a api
        this.rows.push(this.products);
    };
    AllProductsComponent.prototype.openForm = function (id) {
        if (id === void 0) { id = null; }
        this.router.navigate(["/agent/products/productInfo/" + id]);
    };
    AllProductsComponent.prototype.openView = function (id) {
        if (id === void 0) { id = null; }
        this.router.navigate(["/agent/products/" + id]);
    };
    AllProductsComponent.prototype.deleteProduct = function (id) {
        if (id === void 0) { id = null; }
    };
    AllProductsComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-all-products',
            template: __webpack_require__("../../../../../src/app/admin/product/all-products.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/all-products.component.css")]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__shared_services_http_service__["a" /* HttpService */],
            __WEBPACK_IMPORTED_MODULE_1__angular_router__["g" /* Router */]])
    ], AllProductsComponent);
    return AllProductsComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".row{\r\n    margin: 0px 10px;\r\n}\r\n\r\n.field-container{\r\n    width: 100%;\r\n    margin: 5px;\r\n}\r\n\r\n.field{\r\n    width: 100%;\r\n}\r\n\r\n.farsi{\r\n    direction:rtl;\r\n}", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.html":
/***/ (function(module, exports) {

module.exports = "<mat-card class=\"card-view\">\r\n    <mat-card-header style=\"direction:rtl\">\r\n        <mat-card-title>\r\n            <div *ngIf=\"!productId\"><b>افزودن محصول جدید</b></div>\r\n            <div *ngIf=\"productId\"><b>ویرایش محصول</b></div>\r\n        </mat-card-title>\r\n    </mat-card-header>\r\n    <mat-card-content>\r\n        <form (ngSubmit)=\"modifyProduct()\" [formGroup]=\"productBasicForm\">\r\n            <div fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutAlign=\"start start\"\r\n                 fxLayoutAlign.xs=\"center center\" dir=\"rtl\">\r\n                <div fxFlex=\"50\" class=\"field-container\">\r\n                    <mat-input-container class=\"field farsi\">\r\n                        <input matInput type=\"text\" placeholder=\"نام\" formControlName=\"proName\"\r\n                               role=\"proName\"\r\n                               tabindex=\"2\"/>\r\n                        <mat-hint>نام محصول را وارد کنید</mat-hint>\r\n                        <mat-error\r\n                                *ngIf=\"productBasicForm.controls['proName'].hasError('required')\">\r\n                            وارد کردن نام محصول الزامی است\r\n                        </mat-error>\r\n                    </mat-input-container>\r\n                </div>\r\n                <div fxFlex=\"50\" class=\"field-container\">\r\n                    <mat-input-container class=\"field farsi\">\r\n                        <input matInput type=\"number\" placeholder=\"قیمت پایه\" formControlName=\"proPrice\"\r\n                               role=\"proPrice\" tabindex=\"2\"/>\r\n                        <mat-hint>قیمت محصول را وارد کنید</mat-hint>\r\n                        <mat-error *ngIf=\"productBasicForm.controls['proPrice'].hasError('required')\">\r\n                            وارد کردن قیمت محصول الزامی است\r\n                        </mat-error>\r\n                    </mat-input-container>\r\n                </div>\r\n            </div>\r\n            <div fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutAlign=\"start start\"\r\n                 fxLayoutAlign.xs=\"center center\" dir=\"rtl\">\r\n                <div style=\"text-align: right\" class=\"field-container\">\r\n                    <mat-form-field fxFlex=\"100\" style=\"text-align:right;\" tabindex=\"3\">\r\n                        <mat-select placeholder=\"نوع محصول\" formControlName=\"proType\" role=\"proType\">\r\n                            <mat-option *ngFor=\"let type of types\" style=\"text-align:right\" [value]=\"type\">\r\n                                {{type}}\r\n                            </mat-option>\r\n                        </mat-select>\r\n                        <mat-hint>نوع محصول را انتخاب کنید</mat-hint>\r\n                        <mat-error *ngIf=\"productBasicForm.controls['proType'].hasError('required')\">\r\n                            وارد کردن نوع محصول الزامی است\r\n                        </mat-error>\r\n                    </mat-form-field>\r\n                </div>\r\n                <div style=\"text-align: left\" class=\"field-container\">\r\n                    <mat-form-field fxFlex=\"100\" style=\"text-align:right\" tabindex=\"4\">\r\n                        <mat-select placeholder=\"برند\" formControlName=\"proBrand\" role=\"proBrand\">\r\n                            <mat-option *ngFor=\"let brand of brands\" style=\"text-align:right\"\r\n                                        [value]=\"brand\">\r\n                                {{brand}}\r\n                            </mat-option>\r\n                        </mat-select>\r\n                        <mat-hint>برند را انتخاب کنید</mat-hint>\r\n                        <mat-error *ngIf=\"productBasicForm.controls['proBrand'].hasError('required')\">\r\n                            وارد کردن برند محصول الزامی است\r\n                        </mat-error>\r\n                    </mat-form-field>\r\n                </div>\r\n            </div>\r\n            <div class=\"field-container\" dir=\"rtl\">\r\n                <mat-input-container class=\"field\">\r\n                            <textarea matInput placeholder=\"توضیحات\" formControlName=\"proDesc\" role=\"proDesc\"\r\n                                      tabindex=\"5\"></textarea>\r\n                    <mat-hint>حداکثر تا 500 کاراکتر وارد کنید</mat-hint>\r\n                    <mat-error *ngIf=\"productBasicForm.controls['proDesc'].hasError('maxlength')\">تعداد\r\n                        کاراکترهای وارد شده بیش از تعداد مجاز می باشد\r\n                    </mat-error>\r\n                </mat-input-container>\r\n            </div>\r\n            <div role=\"submit-button\" style=\"text-align: left\">\r\n                <button mat-icon-button *ngIf=\"productId\" (click)=\"openView(productId)\" color=\"primary\">\r\n                    <mat-icon aria-label=\"view\" type=\"button\" >visibility</mat-icon>\r\n                </button>\r\n                <button mat-icon-button type=\"submit\"\r\n                        [disabled]=\"upsertBtnShouldDisabled ||(!productBasicForm.valid || (productId && !anyChanges))\"\r\n                        tabindex=\"6\">\r\n                    <mat-icon aria-label=\"accept\">done</mat-icon>\r\n                </button>\r\n                <button mat-icon-button *ngIf=\"productId\"\r\n                        type=\"button\" [disabled]=\"deleteBtnShouldDisabled\" (click)=\"deleteProduct()\"\r\n                        tabindex=\"7\">\r\n                    <mat-icon aria-label=\"delete\">delete</mat-icon>\r\n                </button>\r\n            </div>\r\n        </form>\r\n    </mat-card-content>\r\n</mat-card>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductBasicFormComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_forms__ = __webpack_require__("../../../forms/esm5/forms.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__shared_services_http_service__ = __webpack_require__("../../../../../src/app/shared/services/http.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};






var ProductBasicFormComponent = /** @class */ (function () {
    function ProductBasicFormComponent(httpService, snackBar, route, router) {
        this.httpService = httpService;
        this.snackBar = snackBar;
        this.route = route;
        this.router = router;
        this.types = ['عینک آفتابی', 'تی شرت', 'شلوار', 'کفش'];
        this.brands = ['نایک', 'آدیداس', 'پلیس', 'گپ'];
        this.originalProductBasicForm = null;
        this.upsertBtnShouldDisabled = false;
        this.deleteBtnShouldDisabled = false;
        this.productId = null;
        this.anyChanges = false;
    }
    ProductBasicFormComponent.prototype.ngOnInit = function () {
        var _this = this;
        console.log('*********');
        this.initForm();
        this.route.params.subscribe(function (params) {
            _this.productId = +params['id'] ? +params['id'] : null;
            _this.initProductBasicInfo();
        });
    };
    ProductBasicFormComponent.prototype.initForm = function () {
        this.productBasicForm = new __WEBPACK_IMPORTED_MODULE_1__angular_forms__["FormBuilder"]().group({
            proName: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].required,
                ]],
            proPrice: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].required,
                ]],
            proType: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].required,
                ]],
            proBrand: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].required,
                ]],
            proDesc: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].maxLength(50),
                ]]
        }, {
            validator: this.basicInfoValidation
        });
    };
    ProductBasicFormComponent.prototype.initProductBasicInfo = function () {
        if (!this.productId) {
            this.productBasicForm = null;
            this.initForm();
            return;
        }
    };
    ProductBasicFormComponent.prototype.modifyProduct = function () {
        var _this = this;
        var productBasicInfo = {
            id: this.productId,
            name: this.productBasicForm.controls['proName'].value,
            base_price: this.productBasicForm.controls['proPrice'].value,
            // product_type: this.productBasicForm.controls['proType'].value,
            // brand: this.productBasicForm.controls['proBrand'].value,
            desc: this.productBasicForm.controls['proDesc'].value,
        };
        console.log('==>', productBasicInfo);
        if (!this.productId) {
            delete productBasicInfo.id;
        }
        this.upsertBtnShouldDisabled = true;
        this.deleteBtnShouldDisabled = true;
        this.httpService.put('product', productBasicInfo).subscribe(function (data) {
            _this.snackBar.open(_this.productId ? 'Product is updated' : 'Product is added', null, {
                duration: 2300,
            });
            if (!_this.productId) {
                _this.productBasicForm.reset();
            }
            else {
                _this.originalProductBasicForm = Object.assign({ id: data.id }, productBasicInfo);
                _this.productId = data;
            }
            _this.upsertBtnShouldDisabled = false;
            _this.deleteBtnShouldDisabled = false;
        }, function (err) {
            console.error();
            _this.snackBar.open( true ? 'add' : 'update' + ' this product. Try again', null, {
                duration: 3200,
            });
            _this.upsertBtnShouldDisabled = false;
            _this.deleteBtnShouldDisabled = false;
        });
    };
    ProductBasicFormComponent.prototype.openView = function (id) {
        if (id === void 0) { id = null; }
        this.router.navigate(["/agent/products/" + id]);
    };
    ProductBasicFormComponent.prototype.deleteProduct = function () {
    };
    ProductBasicFormComponent.prototype.basicInfoValidation = function (Ac) {
    };
    ProductBasicFormComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-product-basic-form',
            template: __webpack_require__("../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.css")]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_3__shared_services_http_service__["a" /* HttpService */], __WEBPACK_IMPORTED_MODULE_2__angular_material__["n" /* MatSnackBar */], __WEBPACK_IMPORTED_MODULE_4__angular_router__["a" /* ActivatedRoute */], __WEBPACK_IMPORTED_MODULE_4__angular_router__["g" /* Router */]])
    ], ProductBasicFormComponent);
    return ProductBasicFormComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-color/product-color.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".row{\r\n    margin: 0px 10px;\r\n}\r\n\r\n.field-container{\r\n    width: 100%;\r\n    margin: 5px;\r\n}\r\n\r\n.field{\r\n    width: 100%;\r\n}\r\n\r\n.farsi{\r\n    direction:rtl;\r\n}\r\n\r\n.rs-table{\r\n    margin: 10px;\r\n}", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-color/product-color.component.html":
/***/ (function(module, exports) {

module.exports = "<mat-card class=\"card-view\">\r\n  <mat-card-header style=\"direction:rtl\">\r\n    <mat-card-title>\r\n      <div *ngIf=\"!productId\"><b>رنگ های موجود</b></div>\r\n    </mat-card-title>\r\n  </mat-card-header>\r\n  <mat-card-content>\r\n    <form (ngSubmit)=\"modifyColor()\" [formGroup]=\"productColorForm\">\r\n      <div fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutAlign=\"start start\"\r\n           fxLayoutAlign.xs=\"center center\" dir=\"rtl\">\r\n        <div style=\"text-align: right\" fxFlex=\"100\" class=\"field-container\">\r\n          <mat-form-field style=\"text-align:right;\">\r\n            <mat-select placeholder=\"رنگ محصول\" formControlName=\"proColor\" role=\"proColor\"\r\n                        [(ngModel)]=\"selectedColorId\">\r\n              <mat-option *ngFor=\"let color of colors\" style=\"text-align:right\" [value]=\"color._id\">\r\n                {{color.name}}\r\n              </mat-option>\r\n            </mat-select>\r\n            <mat-hint>رنگ محصول را انتخاب کنید</mat-hint>\r\n            <mat-error *ngIf=\"productColorForm.controls['proColor'].hasError('required')\">\r\n              وارد کردن رنگ محصول الزامی است\r\n            </mat-error>\r\n          </mat-form-field>\r\n        </div>\r\n        <p>{{selectedColor}}</p>\r\n        <app-uploader fxFlex=\"100\" *ngIf=\"selectedColorId\" [url]=\"'product/image/'+ productId + '/' + selectedColorId\"\r\n                      (images)=\"addToTable($event)\"></app-uploader>\r\n\r\n      </div>\r\n    </form>\r\n    <div dir=\"rtl\" style=\"width:100%\">\r\n      <mat-card>\r\n        <div class=\"rs-table\" style=\"width: 100%\">\r\n          <table style=\"width: 100%\">\r\n            <thead>\r\n            <td style=\"width: 10%\"><b>ردیف</b></td>\r\n            <td style=\"width: 10%\"><b>رنگ</b></td>\r\n            <td style=\"width: 70%; text-align: center\"><b>تصاویر</b></td>\r\n            <td style=\"width: 10%\"><b>حذف</b></td>\r\n            </thead>\r\n            <tbody>\r\n            <tr *ngFor=\"let pc of productColors; let i = index\">\r\n              <td>{{i+1}}</td>\r\n              <td>{{pc.info.name}}</td>\r\n              <td *ngFor=\"let image of pc.images\" style=\"text-align: center\"><img style=\"width: 5%\" [src]=\"getURL(image)\">\r\n              </td>\r\n              <td>\r\n                <button mat-icon-button (click)=\"removeImg(pc._id)\" color=\"warn\">\r\n                  <mat-icon aria-label=\"clear\">delete</mat-icon>\r\n                </button>\r\n              </td>\r\n            </tr>\r\n            </tbody>\r\n          </table>\r\n        </div>\r\n      </mat-card>\r\n    </div>\r\n  </mat-card-content>\r\n</mat-card>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-color/product-color.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductColorComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_forms__ = __webpack_require__("../../../forms/esm5/forms.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__shared_services_http_service__ = __webpack_require__("../../../../../src/app/shared/services/http.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_platform_browser__ = __webpack_require__("../../../platform-browser/esm5/platform-browser.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var ProductColorComponent = /** @class */ (function () {
    function ProductColorComponent(httpService, sanitizer) {
        this.httpService = httpService;
        this.sanitizer = sanitizer;
        this.colors = [
            {
                _id: '5a814dc4bfa8b535fc01fac6',
                name: 'سبز',
                color_id: '101'
            },
            {
                _id: '5a814e02bfa8b535fc01fac7',
                name: 'قرمز',
                color_id: '102'
            },
            {
                _id: '5a814e14bfa8b535fc01fac8',
                name: 'صورتی',
                color_id: '103'
            },
            {
                _id: '5a814e24bfa8b535fc01fac9',
                name: 'بنفش',
                color_id: '104'
            }
        ];
        this.productColors = [];
        this.selectedColorId = null;
        this.productId = '5a815bd7bfa8b535fc01fad2';
    }
    ProductColorComponent.prototype.ngOnInit = function () {
        this.initForm();
        this.getProductColors();
    };
    ProductColorComponent.prototype.initForm = function () {
        this.productColorForm = new __WEBPACK_IMPORTED_MODULE_1__angular_forms__["FormBuilder"]().group({
            proColor: [null, [
                    __WEBPACK_IMPORTED_MODULE_1__angular_forms__["Validators"].required,
                ]],
        });
    };
    ProductColorComponent.prototype.getProductColors = function () {
        var _this = this;
        this.httpService.get("product/color/" + this.productId).subscribe(function (res) {
            _this.productColors = [];
            res.body.colors.forEach(function (color) {
                _this.productColors.push(color);
            });
            console.log('-> ', _this.productColors);
        }, function (err) {
        });
    };
    ProductColorComponent.prototype.removeImg = function (id) {
    };
    ProductColorComponent.prototype.addToTable = function (images) {
        var _this = this;
        var pc = this.productColors.filter(function (x) { return x.info._id === _this.selectedColorId; })[0];
        if (pc) {
            pc.images = pc.images.concat(images);
        }
        else {
            var newProductColor = {
                images: images,
                info: this.colors.filter(function (x) { return x._id === _this.selectedColorId; })[0],
                _id: null
            };
            this.productColors.push(newProductColor);
        }
    };
    ProductColorComponent.prototype.getURL = function (path) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(__WEBPACK_IMPORTED_MODULE_2__shared_services_http_service__["a" /* HttpService */].Host + path);
    };
    ProductColorComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-product-color',
            template: __webpack_require__("../../../../../src/app/admin/product/components/product-color/product-color.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/components/product-color/product-color.component.css")]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__shared_services_http_service__["a" /* HttpService */], __WEBPACK_IMPORTED_MODULE_3__angular_platform_browser__["c" /* DomSanitizer */]])
    ], ProductColorComponent);
    return ProductColorComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.html":
/***/ (function(module, exports) {

module.exports = "<div fxLayout=\"row\" class=\"row\" style=\"direction:ltr\">\r\n  <mat-card fxFlex=\"60\" fxFlex.sm=\"100\" fxFlex.xs=\"100\" fxFlexOffset=\"20\" fxFlexOffset.sm=\"0\" fxFlexOffset.xs=\"0\"  style=\"text-align: right\" dir=\"rtl\">\r\n    <mat-tab-group dir=\"rtl\">\r\n      <mat-tab label=\"اطلاعات اولیه\" dir=\"rtl\">\r\n        <app-product-basic-form></app-product-basic-form>\r\n      </mat-tab>\r\n      <mat-tab label=\"رنگ های موجود\">\r\n        <app-product-color></app-product-color>\r\n      </mat-tab>\r\n      <mat-tab label=\"سایزهای موجود\">\r\n        <app-product-size></app-product-size>\r\n      </mat-tab>\r\n    </mat-tab-group>\r\n  </mat-card>\r\n</div>"

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductFullInfoComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var ProductFullInfoComponent = /** @class */ (function () {
    function ProductFullInfoComponent() {
    }
    ProductFullInfoComponent.prototype.ngOnInit = function () {
    };
    ProductFullInfoComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-product-full-info',
            template: __webpack_require__("../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], ProductFullInfoComponent);
    return ProductFullInfoComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-size/product-size.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-size/product-size.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\r\n  product-size works!\r\n</p>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-size/product-size.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductSizeComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var ProductSizeComponent = /** @class */ (function () {
    function ProductSizeComponent() {
    }
    ProductSizeComponent.prototype.ngOnInit = function () {
    };
    ProductSizeComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-product-size',
            template: __webpack_require__("../../../../../src/app/admin/product/components/product-size/product-size.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/components/product-size/product-size.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], ProductSizeComponent);
    return ProductSizeComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-view/product-view.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-view/product-view.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\r\n  product-view works!\r\n</p>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/product/components/product-view/product-view.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductViewComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var ProductViewComponent = /** @class */ (function () {
    function ProductViewComponent() {
    }
    ProductViewComponent.prototype.ngOnInit = function () {
    };
    ProductViewComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-product-view',
            template: __webpack_require__("../../../../../src/app/admin/product/components/product-view/product-view.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/product/components/product-view/product-view.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], ProductViewComponent);
    return ProductViewComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/product.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ProductModule", function() { return ProductModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_common__ = __webpack_require__("../../../common/esm5/common.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_flex_layout__ = __webpack_require__("../../../flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__product_routing__ = __webpack_require__("../../../../../src/app/admin/product/product.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__angular_forms__ = __webpack_require__("../../../forms/esm5/forms.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__all_products_component__ = __webpack_require__("../../../../../src/app/admin/product/all-products.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_product_basic_form_product_basic_form_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__components_product_view_product_view_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-view/product-view.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__components_product_full_info_product_full_info_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_product_color_product_color_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-color/product-color.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__components_product_size_product_size_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-size/product-size.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__shared_components_uploader_uploader_component__ = __webpack_require__("../../../../../src/app/shared/components/uploader/uploader.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_ng2_file_upload__ = __webpack_require__("../../../../ng2-file-upload/index.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_ng2_file_upload___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_13_ng2_file_upload__);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};














var ProductModule = /** @class */ (function () {
    function ProductModule() {
    }
    ProductModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["NgModule"])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__all_products_component__["a" /* AllProductsComponent */],
                __WEBPACK_IMPORTED_MODULE_7__components_product_basic_form_product_basic_form_component__["a" /* ProductBasicFormComponent */],
                __WEBPACK_IMPORTED_MODULE_8__components_product_view_product_view_component__["a" /* ProductViewComponent */],
                __WEBPACK_IMPORTED_MODULE_9__components_product_full_info_product_full_info_component__["a" /* ProductFullInfoComponent */],
                __WEBPACK_IMPORTED_MODULE_10__components_product_color_product_color_component__["a" /* ProductColorComponent */],
                __WEBPACK_IMPORTED_MODULE_11__components_product_size_product_size_component__["a" /* ProductSizeComponent */],
                __WEBPACK_IMPORTED_MODULE_12__shared_components_uploader_uploader_component__["a" /* UploaderComponent */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__product_routing__["a" /* ProductRouting */],
                __WEBPACK_IMPORTED_MODULE_1__angular_common__["CommonModule"],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_3__angular_flex_layout__["a" /* FlexLayoutModule */],
                __WEBPACK_IMPORTED_MODULE_5__angular_forms__["FormsModule"],
                __WEBPACK_IMPORTED_MODULE_5__angular_forms__["ReactiveFormsModule"],
                __WEBPACK_IMPORTED_MODULE_3__angular_flex_layout__["a" /* FlexLayoutModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MatCardModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MatInputModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["o" /* MatSnackBarModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MatDialogModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["l" /* MatSelectModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["p" /* MatTabsModule */],
                __WEBPACK_IMPORTED_MODULE_13_ng2_file_upload__["FileUploadModule"]
            ],
        })
    ], ProductModule);
    return ProductModule;
}());



/***/ }),

/***/ "../../../../../src/app/admin/product/product.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ProductRouting; });
/* unused harmony export ProductTestRouting */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_router_testing__ = __webpack_require__("../../../router/esm5/testing.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_product_view_product_view_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-view/product-view.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_product_basic_form_product_basic_form_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-basic-form/product-basic-form.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__all_products_component__ = __webpack_require__("../../../../../src/app/admin/product/all-products.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_product_color_product_color_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-color/product-color.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_product_size_product_size_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-size/product-size.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_product_full_info_product_full_info_component__ = __webpack_require__("../../../../../src/app/admin/product/components/product-full-info/product-full-info.component.ts");








var Product_ROUTES = [
    { path: '', component: __WEBPACK_IMPORTED_MODULE_4__all_products_component__["a" /* AllProductsComponent */], pathMatch: 'full' },
    { path: 'productInfo/:id', component: __WEBPACK_IMPORTED_MODULE_7__components_product_full_info_product_full_info_component__["a" /* ProductFullInfoComponent */] },
    { path: 'productBasicForm/:id', component: __WEBPACK_IMPORTED_MODULE_3__components_product_basic_form_product_basic_form_component__["a" /* ProductBasicFormComponent */] },
    { path: 'productColor/:id', component: __WEBPACK_IMPORTED_MODULE_5__components_product_color_product_color_component__["a" /* ProductColorComponent */] },
    { path: 'productSize/:id', component: __WEBPACK_IMPORTED_MODULE_6__components_product_size_product_size_component__["a" /* ProductSizeComponent */] },
    { path: ':id', component: __WEBPACK_IMPORTED_MODULE_2__components_product_view_product_view_component__["a" /* ProductViewComponent */] }
];
var ProductRouting = __WEBPACK_IMPORTED_MODULE_0__angular_router__["h" /* RouterModule */].forChild(Product_ROUTES);
var ProductTestRouting = __WEBPACK_IMPORTED_MODULE_1__angular_router_testing__["a" /* RouterTestingModule */].withRoutes(Product_ROUTES);


/***/ }),

/***/ "../../../../../src/app/shared/components/uploader/uploader.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".my-drop-zone { border: dotted 3px lightgray; min-height:200px}\r\n.nv-file-over { border: dotted 3px red; }\r\n/* Default class applied to drop zones on over */\r\n.another-file-over-class { border: dotted 3px green; }\r\n", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/shared/components/uploader/uploader.component.html":
/***/ (function(module, exports) {

module.exports = "<p>صف بارگذاری: {{ uploader?.queue?.length }}</p>\n<table class=\"table\" >\n  <thead>\n  <tr>\n    <th>نام فایل</th>\n    <th>اندازه</th>\n    <th>درصد پیشرفت</th>\n    <th>وضعیت</th>\n    <th>عملیات</th>\n  </tr>\n  </thead>\n  <tbody>\n  <tr *ngFor=\"let item of uploader.queue\">\n    <td><strong>{{ item?.file?.name }}</strong></td>\n    <td nowrap>{{ item?.file?.size/1024/1024 | number:'.2' }} MB</td>\n    <td>\n      <div class=\"progress\" style=\"margin-bottom: 0;\">\n        <div class=\"progress-bar\" role=\"progressbar\" [ngStyle]=\"{ 'width': item.progress + '%' }\"></div>\n      </div>\n    </td>\n    <td class=\"text-center\">\n      <span *ngIf=\"item.isSuccess\"><i class=\"fa fa-check\"></i></span>\n      <span *ngIf=\"item.isCancel\"><i class=\"fa fa-ban\"></i></span>\n      <span *ngIf=\"item.isError\"><i class=\"fa fa-remove\"></i></span>\n    </td>\n    <td nowrap>\n      <button type=\"button\" class=\"btn btn-success btn-xs\"\n              (click)=\"item.upload()\" [disabled]=\"item.isReady || item.isUploading || item.isSuccess || !personnel_id\">\n        <span class=\"fa fa-upload\"></span> بارگذاری\n      </button>\n      <button type=\"button\" class=\"btn btn-warning btn-xs\"\n              (click)=\"item.cancel()\" [disabled]=\"!item.isUploading\">\n        <span class=\"fa fa-ban\"></span> لغو\n      </button>\n      <button type=\"button\" class=\"btn btn-danger btn-xs\"\n              (click)=\"item.remove()\">\n        <span class=\"fa fa-trash\"></span> حذف\n      </button>\n    </td>\n  </tr>\n  <tr><td colspan=\"5\"><div ng2FileDrop\n                           [ngClass]=\"{'nv-file-over': hasBaseDropZoneOver}\"\n                           (fileOver)=\"fileOverBase($event)\"\n                           [uploader]=\"uploader\"\n                           class=\"well my-drop-zone\">\n  </div></td></tr>\n  </tbody>\n</table>\n\n<div >\n  <div>\n    پیشرفت صف:\n    <div class=\"progress\" style=\"\">\n      <div class=\"progress-bar\" role=\"progressbar\" [ngStyle]=\"{ 'width': uploader.progress + '%' }\"></div>\n    </div>\n  </div>\n  <button type=\"button\" class=\"btn btn-success btn-s\"\n          (click)=\"uploader.uploadAll()\" [disabled]=\"!uploader.getNotUploadedItems().length\">\n    <span class=\"fa fa-upload\"></span> بارگذاری همه\n  </button>\n  <button type=\"button\" class=\"btn btn-warning btn-s\"\n          (click)=\"uploader.cancelAll()\" [disabled]=\"!uploader.isUploading\">\n    <span class=\"fa fa-ban\"></span> لغو همه\n  </button>\n  <button type=\"button\" class=\"btn btn-danger btn-s\"\n          (click)=\"uploader.clearQueue()\" [disabled]=\"!uploader.queue.length\">\n    <span class=\"fa fa-trash\"></span> حذف همه\n  </button>\n</div>\n"

/***/ }),

/***/ "../../../../../src/app/shared/components/uploader/uploader.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return UploaderComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ng2_file_upload__ = __webpack_require__("../../../../ng2-file-upload/index.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ng2_file_upload___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_ng2_file_upload__);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var UploaderComponent = /** @class */ (function () {
    function UploaderComponent() {
        this.hasBaseDropZoneOver = true;
        this.enabled = false;
        this.images = new __WEBPACK_IMPORTED_MODULE_0__angular_core__["EventEmitter"]();
        this.imagesList = [];
    }
    UploaderComponent.prototype.ngOnChanges = function (changes) {
        if (changes.url && changes.url.currentValue) {
            this.uploader = new __WEBPACK_IMPORTED_MODULE_1_ng2_file_upload__["FileUploader"]({ url: 'api/' + this.url });
        }
    };
    UploaderComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.uploader = new __WEBPACK_IMPORTED_MODULE_1_ng2_file_upload__["FileUploader"]({ url: 'api/' + this.url });
        this.enabled = true;
        this.uploader.onSuccessItem = function (item, response, status, headers) {
            var result = JSON.parse(response);
            _this.imagesList.push(result.downloadURL);
        };
        this.uploader.onCompleteAll = function () {
            _this.images.emit(_this.imagesList);
            _this.imagesList = [];
        };
    };
    UploaderComponent.prototype.fileOverBase = function (e) {
        this.hasBaseDropZoneOver = e;
    };
    UploaderComponent.prototype.ngOnDestroy = function () {
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Input"])(),
        __metadata("design:type", String)
    ], UploaderComponent.prototype, "url", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Output"])(),
        __metadata("design:type", Object)
    ], UploaderComponent.prototype, "images", void 0);
    UploaderComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-uploader',
            template: __webpack_require__("../../../../../src/app/shared/components/uploader/uploader.component.html"),
            styles: [__webpack_require__("../../../../../src/app/shared/components/uploader/uploader.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], UploaderComponent);
    return UploaderComponent;
}());



/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-drop.directive.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = __webpack_require__("../../../core/esm5/core.js");
var file_uploader_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-uploader.class.js");
var FileDropDirective = (function () {
    function FileDropDirective(element) {
        this.fileOver = new core_1.EventEmitter();
        this.onFileDrop = new core_1.EventEmitter();
        this.element = element;
    }
    FileDropDirective.prototype.getOptions = function () {
        return this.uploader.options;
    };
    FileDropDirective.prototype.getFilters = function () {
        return {};
    };
    FileDropDirective.prototype.onDrop = function (event) {
        var transfer = this._getTransfer(event);
        if (!transfer) {
            return;
        }
        var options = this.getOptions();
        var filters = this.getFilters();
        this._preventAndStop(event);
        this.uploader.addToQueue(transfer.files, options, filters);
        this.fileOver.emit(false);
        this.onFileDrop.emit(transfer.files);
    };
    FileDropDirective.prototype.onDragOver = function (event) {
        var transfer = this._getTransfer(event);
        if (!this._haveFiles(transfer.types)) {
            return;
        }
        transfer.dropEffect = 'copy';
        this._preventAndStop(event);
        this.fileOver.emit(true);
    };
    FileDropDirective.prototype.onDragLeave = function (event) {
        if (this.element) {
            if (event.currentTarget === this.element[0]) {
                return;
            }
        }
        this._preventAndStop(event);
        this.fileOver.emit(false);
    };
    FileDropDirective.prototype._getTransfer = function (event) {
        return event.dataTransfer ? event.dataTransfer : event.originalEvent.dataTransfer; // jQuery fix;
    };
    FileDropDirective.prototype._preventAndStop = function (event) {
        event.preventDefault();
        event.stopPropagation();
    };
    FileDropDirective.prototype._haveFiles = function (types) {
        if (!types) {
            return false;
        }
        if (types.indexOf) {
            return types.indexOf('Files') !== -1;
        }
        else if (types.contains) {
            return types.contains('Files');
        }
        else {
            return false;
        }
    };
    return FileDropDirective;
}());
__decorate([
    core_1.Input(),
    __metadata("design:type", file_uploader_class_1.FileUploader)
], FileDropDirective.prototype, "uploader", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FileDropDirective.prototype, "fileOver", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FileDropDirective.prototype, "onFileDrop", void 0);
__decorate([
    core_1.HostListener('drop', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FileDropDirective.prototype, "onDrop", null);
__decorate([
    core_1.HostListener('dragover', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FileDropDirective.prototype, "onDragOver", null);
__decorate([
    core_1.HostListener('dragleave', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], FileDropDirective.prototype, "onDragLeave", null);
FileDropDirective = __decorate([
    core_1.Directive({ selector: '[ng2FileDrop]' }),
    __metadata("design:paramtypes", [core_1.ElementRef])
], FileDropDirective);
exports.FileDropDirective = FileDropDirective;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-item.class.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var file_like_object_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-like-object.class.js");
var FileItem = (function () {
    function FileItem(uploader, some, options) {
        this.url = '/';
        this.headers = [];
        this.withCredentials = true;
        this.formData = [];
        this.isReady = false;
        this.isUploading = false;
        this.isUploaded = false;
        this.isSuccess = false;
        this.isCancel = false;
        this.isError = false;
        this.progress = 0;
        this.index = void 0;
        this.uploader = uploader;
        this.some = some;
        this.options = options;
        this.file = new file_like_object_class_1.FileLikeObject(some);
        this._file = some;
        if (uploader.options) {
            this.method = uploader.options.method || 'POST';
            this.alias = uploader.options.itemAlias || 'file';
        }
        this.url = uploader.options.url;
    }
    FileItem.prototype.upload = function () {
        try {
            this.uploader.uploadItem(this);
        }
        catch (e) {
            this.uploader._onCompleteItem(this, '', 0, {});
            this.uploader._onErrorItem(this, '', 0, {});
        }
    };
    FileItem.prototype.cancel = function () {
        this.uploader.cancelItem(this);
    };
    FileItem.prototype.remove = function () {
        this.uploader.removeFromQueue(this);
    };
    FileItem.prototype.onBeforeUpload = function () {
        return void 0;
    };
    FileItem.prototype.onBuildForm = function (form) {
        return { form: form };
    };
    FileItem.prototype.onProgress = function (progress) {
        return { progress: progress };
    };
    FileItem.prototype.onSuccess = function (response, status, headers) {
        return { response: response, status: status, headers: headers };
    };
    FileItem.prototype.onError = function (response, status, headers) {
        return { response: response, status: status, headers: headers };
    };
    FileItem.prototype.onCancel = function (response, status, headers) {
        return { response: response, status: status, headers: headers };
    };
    FileItem.prototype.onComplete = function (response, status, headers) {
        return { response: response, status: status, headers: headers };
    };
    FileItem.prototype._onBeforeUpload = function () {
        this.isReady = true;
        this.isUploading = true;
        this.isUploaded = false;
        this.isSuccess = false;
        this.isCancel = false;
        this.isError = false;
        this.progress = 0;
        this.onBeforeUpload();
    };
    FileItem.prototype._onBuildForm = function (form) {
        this.onBuildForm(form);
    };
    FileItem.prototype._onProgress = function (progress) {
        this.progress = progress;
        this.onProgress(progress);
    };
    FileItem.prototype._onSuccess = function (response, status, headers) {
        this.isReady = false;
        this.isUploading = false;
        this.isUploaded = true;
        this.isSuccess = true;
        this.isCancel = false;
        this.isError = false;
        this.progress = 100;
        this.index = void 0;
        this.onSuccess(response, status, headers);
    };
    FileItem.prototype._onError = function (response, status, headers) {
        this.isReady = false;
        this.isUploading = false;
        this.isUploaded = true;
        this.isSuccess = false;
        this.isCancel = false;
        this.isError = true;
        this.progress = 0;
        this.index = void 0;
        this.onError(response, status, headers);
    };
    FileItem.prototype._onCancel = function (response, status, headers) {
        this.isReady = false;
        this.isUploading = false;
        this.isUploaded = false;
        this.isSuccess = false;
        this.isCancel = true;
        this.isError = false;
        this.progress = 0;
        this.index = void 0;
        this.onCancel(response, status, headers);
    };
    FileItem.prototype._onComplete = function (response, status, headers) {
        this.onComplete(response, status, headers);
        if (this.uploader.options.removeAfterUpload) {
            this.remove();
        }
    };
    FileItem.prototype._prepareToUploading = function () {
        this.index = this.index || ++this.uploader._nextIndex;
        this.isReady = true;
    };
    return FileItem;
}());
exports.FileItem = FileItem;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-like-object.class.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function isElement(node) {
    return !!(node && (node.nodeName || node.prop && node.attr && node.find));
}
var FileLikeObject = (function () {
    function FileLikeObject(fileOrInput) {
        this.rawFile = fileOrInput;
        var isInput = isElement(fileOrInput);
        var fakePathOrObject = isInput ? fileOrInput.value : fileOrInput;
        var postfix = typeof fakePathOrObject === 'string' ? 'FakePath' : 'Object';
        var method = '_createFrom' + postfix;
        this[method](fakePathOrObject);
    }
    FileLikeObject.prototype._createFromFakePath = function (path) {
        this.lastModifiedDate = void 0;
        this.size = void 0;
        this.type = 'like/' + path.slice(path.lastIndexOf('.') + 1).toLowerCase();
        this.name = path.slice(path.lastIndexOf('/') + path.lastIndexOf('\\') + 2);
    };
    FileLikeObject.prototype._createFromObject = function (object) {
        this.size = object.size;
        this.type = object.type;
        this.name = object.name;
    };
    return FileLikeObject;
}());
exports.FileLikeObject = FileLikeObject;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-select.directive.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = __webpack_require__("../../../core/esm5/core.js");
var file_uploader_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-uploader.class.js");
var FileSelectDirective = (function () {
    function FileSelectDirective(element) {
        this.onFileSelected = new core_1.EventEmitter();
        this.element = element;
    }
    FileSelectDirective.prototype.getOptions = function () {
        return this.uploader.options;
    };
    FileSelectDirective.prototype.getFilters = function () {
        return {};
    };
    FileSelectDirective.prototype.isEmptyAfterSelection = function () {
        return !!this.element.nativeElement.attributes.multiple;
    };
    FileSelectDirective.prototype.onChange = function () {
        var files = this.element.nativeElement.files;
        var options = this.getOptions();
        var filters = this.getFilters();
        this.uploader.addToQueue(files, options, filters);
        this.onFileSelected.emit(files);
        if (this.isEmptyAfterSelection()) {
            this.element.nativeElement.value = '';
        }
    };
    return FileSelectDirective;
}());
__decorate([
    core_1.Input(),
    __metadata("design:type", file_uploader_class_1.FileUploader)
], FileSelectDirective.prototype, "uploader", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FileSelectDirective.prototype, "onFileSelected", void 0);
__decorate([
    core_1.HostListener('change'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], FileSelectDirective.prototype, "onChange", null);
FileSelectDirective = __decorate([
    core_1.Directive({ selector: '[ng2FileSelect]' }),
    __metadata("design:paramtypes", [core_1.ElementRef])
], FileSelectDirective);
exports.FileSelectDirective = FileSelectDirective;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-type.class.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var FileType = (function () {
    function FileType() {
    }
    FileType.getMimeClass = function (file) {
        var mimeClass = 'application';
        if (this.mime_psd.indexOf(file.type) !== -1) {
            mimeClass = 'image';
        }
        else if (file.type.match('image.*')) {
            mimeClass = 'image';
        }
        else if (file.type.match('video.*')) {
            mimeClass = 'video';
        }
        else if (file.type.match('audio.*')) {
            mimeClass = 'audio';
        }
        else if (file.type === 'application/pdf') {
            mimeClass = 'pdf';
        }
        else if (this.mime_compress.indexOf(file.type) !== -1) {
            mimeClass = 'compress';
        }
        else if (this.mime_doc.indexOf(file.type) !== -1) {
            mimeClass = 'doc';
        }
        else if (this.mime_xsl.indexOf(file.type) !== -1) {
            mimeClass = 'xls';
        }
        else if (this.mime_ppt.indexOf(file.type) !== -1) {
            mimeClass = 'ppt';
        }
        if (mimeClass === 'application') {
            mimeClass = this.fileTypeDetection(file.name);
        }
        return mimeClass;
    };
    FileType.fileTypeDetection = function (inputFilename) {
        var types = {
            'jpg': 'image',
            'jpeg': 'image',
            'tif': 'image',
            'psd': 'image',
            'bmp': 'image',
            'png': 'image',
            'nef': 'image',
            'tiff': 'image',
            'cr2': 'image',
            'dwg': 'image',
            'cdr': 'image',
            'ai': 'image',
            'indd': 'image',
            'pin': 'image',
            'cdp': 'image',
            'skp': 'image',
            'stp': 'image',
            '3dm': 'image',
            'mp3': 'audio',
            'wav': 'audio',
            'wma': 'audio',
            'mod': 'audio',
            'm4a': 'audio',
            'compress': 'compress',
            'zip': 'compress',
            'rar': 'compress',
            '7z': 'compress',
            'lz': 'compress',
            'z01': 'compress',
            'pdf': 'pdf',
            'xls': 'xls',
            'xlsx': 'xls',
            'ods': 'xls',
            'mp4': 'video',
            'avi': 'video',
            'wmv': 'video',
            'mpg': 'video',
            'mts': 'video',
            'flv': 'video',
            '3gp': 'video',
            'vob': 'video',
            'm4v': 'video',
            'mpeg': 'video',
            'm2ts': 'video',
            'mov': 'video',
            'doc': 'doc',
            'docx': 'doc',
            'eps': 'doc',
            'txt': 'doc',
            'odt': 'doc',
            'rtf': 'doc',
            'ppt': 'ppt',
            'pptx': 'ppt',
            'pps': 'ppt',
            'ppsx': 'ppt',
            'odp': 'ppt'
        };
        var chunks = inputFilename.split('.');
        if (chunks.length < 2) {
            return 'application';
        }
        var extension = chunks[chunks.length - 1].toLowerCase();
        if (types[extension] === undefined) {
            return 'application';
        }
        else {
            return types[extension];
        }
    };
    return FileType;
}());
/*  MS office  */
FileType.mime_doc = [
    'application/msword',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.ms-word.document.macroEnabled.12',
    'application/vnd.ms-word.template.macroEnabled.12'
];
FileType.mime_xsl = [
    'application/vnd.ms-excel',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.template.macroEnabled.12',
    'application/vnd.ms-excel.addin.macroEnabled.12',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
];
FileType.mime_ppt = [
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.template',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.ms-powerpoint.addin.macroEnabled.12',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12'
];
/* PSD */
FileType.mime_psd = [
    'image/photoshop',
    'image/x-photoshop',
    'image/psd',
    'application/photoshop',
    'application/psd',
    'zz-application/zz-winassoc-psd'
];
/* Compressed files */
FileType.mime_compress = [
    'application/x-gtar',
    'application/x-gcompress',
    'application/compress',
    'application/x-tar',
    'application/x-rar-compressed',
    'application/octet-stream'
];
exports.FileType = FileType;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-upload.module.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var common_1 = __webpack_require__("../../../common/esm5/common.js");
var core_1 = __webpack_require__("../../../core/esm5/core.js");
var file_drop_directive_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-drop.directive.js");
var file_select_directive_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-select.directive.js");
var FileUploadModule = (function () {
    function FileUploadModule() {
    }
    return FileUploadModule;
}());
FileUploadModule = __decorate([
    core_1.NgModule({
        imports: [common_1.CommonModule],
        declarations: [file_drop_directive_1.FileDropDirective, file_select_directive_1.FileSelectDirective],
        exports: [file_drop_directive_1.FileDropDirective, file_select_directive_1.FileSelectDirective]
    })
], FileUploadModule);
exports.FileUploadModule = FileUploadModule;


/***/ }),

/***/ "../../../../ng2-file-upload/file-upload/file-uploader.class.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var core_1 = __webpack_require__("../../../core/esm5/core.js");
var file_like_object_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-like-object.class.js");
var file_item_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-item.class.js");
var file_type_class_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-type.class.js");
function isFile(value) {
    return (File && value instanceof File);
}
var FileUploader = (function () {
    function FileUploader(options) {
        this.isUploading = false;
        this.queue = [];
        this.progress = 0;
        this._nextIndex = 0;
        this.options = {
            autoUpload: false,
            isHTML5: true,
            filters: [],
            removeAfterUpload: false,
            disableMultipart: false,
            formatDataFunction: function (item) { return item._file; },
            formatDataFunctionIsAsync: false
        };
        this.setOptions(options);
        this.response = new core_1.EventEmitter();
    }
    FileUploader.prototype.setOptions = function (options) {
        this.options = Object.assign(this.options, options);
        this.authToken = this.options.authToken;
        this.authTokenHeader = this.options.authTokenHeader || 'Authorization';
        this.autoUpload = this.options.autoUpload;
        this.options.filters.unshift({ name: 'queueLimit', fn: this._queueLimitFilter });
        if (this.options.maxFileSize) {
            this.options.filters.unshift({ name: 'fileSize', fn: this._fileSizeFilter });
        }
        if (this.options.allowedFileType) {
            this.options.filters.unshift({ name: 'fileType', fn: this._fileTypeFilter });
        }
        if (this.options.allowedMimeType) {
            this.options.filters.unshift({ name: 'mimeType', fn: this._mimeTypeFilter });
        }
        for (var i = 0; i < this.queue.length; i++) {
            this.queue[i].url = this.options.url;
        }
    };
    FileUploader.prototype.addToQueue = function (files, options, filters) {
        var _this = this;
        var list = [];
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            list.push(file);
        }
        var arrayOfFilters = this._getFilters(filters);
        var count = this.queue.length;
        var addedFileItems = [];
        list.map(function (some) {
            if (!options) {
                options = _this.options;
            }
            var temp = new file_like_object_class_1.FileLikeObject(some);
            if (_this._isValidFile(temp, arrayOfFilters, options)) {
                var fileItem = new file_item_class_1.FileItem(_this, some, options);
                addedFileItems.push(fileItem);
                _this.queue.push(fileItem);
                _this._onAfterAddingFile(fileItem);
            }
            else {
                var filter = arrayOfFilters[_this._failFilterIndex];
                _this._onWhenAddingFileFailed(temp, filter, options);
            }
        });
        if (this.queue.length !== count) {
            this._onAfterAddingAll(addedFileItems);
            this.progress = this._getTotalProgress();
        }
        this._render();
        if (this.options.autoUpload) {
            this.uploadAll();
        }
    };
    FileUploader.prototype.removeFromQueue = function (value) {
        var index = this.getIndexOfItem(value);
        var item = this.queue[index];
        if (item.isUploading) {
            item.cancel();
        }
        this.queue.splice(index, 1);
        this.progress = this._getTotalProgress();
    };
    FileUploader.prototype.clearQueue = function () {
        while (this.queue.length) {
            this.queue[0].remove();
        }
        this.progress = 0;
    };
    FileUploader.prototype.uploadItem = function (value) {
        var index = this.getIndexOfItem(value);
        var item = this.queue[index];
        var transport = this.options.isHTML5 ? '_xhrTransport' : '_iframeTransport';
        item._prepareToUploading();
        if (this.isUploading) {
            return;
        }
        this.isUploading = true;
        this[transport](item);
    };
    FileUploader.prototype.cancelItem = function (value) {
        var index = this.getIndexOfItem(value);
        var item = this.queue[index];
        var prop = this.options.isHTML5 ? item._xhr : item._form;
        if (item && item.isUploading) {
            prop.abort();
        }
    };
    FileUploader.prototype.uploadAll = function () {
        var items = this.getNotUploadedItems().filter(function (item) { return !item.isUploading; });
        if (!items.length) {
            return;
        }
        items.map(function (item) { return item._prepareToUploading(); });
        items[0].upload();
    };
    FileUploader.prototype.cancelAll = function () {
        var items = this.getNotUploadedItems();
        items.map(function (item) { return item.cancel(); });
    };
    FileUploader.prototype.isFile = function (value) {
        return isFile(value);
    };
    FileUploader.prototype.isFileLikeObject = function (value) {
        return value instanceof file_like_object_class_1.FileLikeObject;
    };
    FileUploader.prototype.getIndexOfItem = function (value) {
        return typeof value === 'number' ? value : this.queue.indexOf(value);
    };
    FileUploader.prototype.getNotUploadedItems = function () {
        return this.queue.filter(function (item) { return !item.isUploaded; });
    };
    FileUploader.prototype.getReadyItems = function () {
        return this.queue
            .filter(function (item) { return (item.isReady && !item.isUploading); })
            .sort(function (item1, item2) { return item1.index - item2.index; });
    };
    FileUploader.prototype.destroy = function () {
        return void 0;
    };
    FileUploader.prototype.onAfterAddingAll = function (fileItems) {
        return { fileItems: fileItems };
    };
    FileUploader.prototype.onBuildItemForm = function (fileItem, form) {
        return { fileItem: fileItem, form: form };
    };
    FileUploader.prototype.onAfterAddingFile = function (fileItem) {
        return { fileItem: fileItem };
    };
    FileUploader.prototype.onWhenAddingFileFailed = function (item, filter, options) {
        return { item: item, filter: filter, options: options };
    };
    FileUploader.prototype.onBeforeUploadItem = function (fileItem) {
        return { fileItem: fileItem };
    };
    FileUploader.prototype.onProgressItem = function (fileItem, progress) {
        return { fileItem: fileItem, progress: progress };
    };
    FileUploader.prototype.onProgressAll = function (progress) {
        return { progress: progress };
    };
    FileUploader.prototype.onSuccessItem = function (item, response, status, headers) {
        return { item: item, response: response, status: status, headers: headers };
    };
    FileUploader.prototype.onErrorItem = function (item, response, status, headers) {
        return { item: item, response: response, status: status, headers: headers };
    };
    FileUploader.prototype.onCancelItem = function (item, response, status, headers) {
        return { item: item, response: response, status: status, headers: headers };
    };
    FileUploader.prototype.onCompleteItem = function (item, response, status, headers) {
        return { item: item, response: response, status: status, headers: headers };
    };
    FileUploader.prototype.onCompleteAll = function () {
        return void 0;
    };
    FileUploader.prototype._mimeTypeFilter = function (item) {
        return !(this.options.allowedMimeType && this.options.allowedMimeType.indexOf(item.type) === -1);
    };
    FileUploader.prototype._fileSizeFilter = function (item) {
        return !(this.options.maxFileSize && item.size > this.options.maxFileSize);
    };
    FileUploader.prototype._fileTypeFilter = function (item) {
        return !(this.options.allowedFileType &&
            this.options.allowedFileType.indexOf(file_type_class_1.FileType.getMimeClass(item)) === -1);
    };
    FileUploader.prototype._onErrorItem = function (item, response, status, headers) {
        item._onError(response, status, headers);
        this.onErrorItem(item, response, status, headers);
    };
    FileUploader.prototype._onCompleteItem = function (item, response, status, headers) {
        item._onComplete(response, status, headers);
        this.onCompleteItem(item, response, status, headers);
        var nextItem = this.getReadyItems()[0];
        this.isUploading = false;
        if (nextItem) {
            nextItem.upload();
            return;
        }
        this.onCompleteAll();
        this.progress = this._getTotalProgress();
        this._render();
    };
    FileUploader.prototype._headersGetter = function (parsedHeaders) {
        return function (name) {
            if (name) {
                return parsedHeaders[name.toLowerCase()] || void 0;
            }
            return parsedHeaders;
        };
    };
    FileUploader.prototype._xhrTransport = function (item) {
        var _this = this;
        var that = this;
        var xhr = item._xhr = new XMLHttpRequest();
        var sendable;
        this._onBeforeUploadItem(item);
        if (typeof item._file.size !== 'number') {
            throw new TypeError('The file specified is no longer valid');
        }
        if (!this.options.disableMultipart) {
            sendable = new FormData();
            this._onBuildItemForm(item, sendable);
            var appendFile = function () { return sendable.append(item.alias, item._file, item.file.name); };
            if (!this.options.parametersBeforeFiles) {
                appendFile();
            }
            // For AWS, Additional Parameters must come BEFORE Files
            if (this.options.additionalParameter !== undefined) {
                Object.keys(this.options.additionalParameter).forEach(function (key) {
                    var paramVal = _this.options.additionalParameter[key];
                    // Allow an additional parameter to include the filename
                    if (typeof paramVal === 'string' && paramVal.indexOf('{{file_name}}') >= 0) {
                        paramVal = paramVal.replace('{{file_name}}', item.file.name);
                    }
                    sendable.append(key, paramVal);
                });
            }
            if (this.options.parametersBeforeFiles) {
                appendFile();
            }
        }
        else {
            sendable = this.options.formatDataFunction(item);
        }
        xhr.upload.onprogress = function (event) {
            var progress = Math.round(event.lengthComputable ? event.loaded * 100 / event.total : 0);
            _this._onProgressItem(item, progress);
        };
        xhr.onload = function () {
            var headers = _this._parseHeaders(xhr.getAllResponseHeaders());
            var response = _this._transformResponse(xhr.response, headers);
            var gist = _this._isSuccessCode(xhr.status) ? 'Success' : 'Error';
            var method = '_on' + gist + 'Item';
            _this[method](item, response, xhr.status, headers);
            _this._onCompleteItem(item, response, xhr.status, headers);
        };
        xhr.onerror = function () {
            var headers = _this._parseHeaders(xhr.getAllResponseHeaders());
            var response = _this._transformResponse(xhr.response, headers);
            _this._onErrorItem(item, response, xhr.status, headers);
            _this._onCompleteItem(item, response, xhr.status, headers);
        };
        xhr.onabort = function () {
            var headers = _this._parseHeaders(xhr.getAllResponseHeaders());
            var response = _this._transformResponse(xhr.response, headers);
            _this._onCancelItem(item, response, xhr.status, headers);
            _this._onCompleteItem(item, response, xhr.status, headers);
        };
        xhr.open(item.method, item.url, true);
        xhr.withCredentials = item.withCredentials;
        if (this.options.headers) {
            for (var _i = 0, _a = this.options.headers; _i < _a.length; _i++) {
                var header = _a[_i];
                xhr.setRequestHeader(header.name, header.value);
            }
        }
        if (item.headers.length) {
            for (var _b = 0, _c = item.headers; _b < _c.length; _b++) {
                var header = _c[_b];
                xhr.setRequestHeader(header.name, header.value);
            }
        }
        if (this.authToken) {
            xhr.setRequestHeader(this.authTokenHeader, this.authToken);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                that.response.emit(xhr.responseText);
            }
        };
        if (this.options.formatDataFunctionIsAsync) {
            sendable.then(function (result) { return xhr.send(JSON.stringify(result)); });
        }
        else {
            xhr.send(sendable);
        }
        this._render();
    };
    FileUploader.prototype._getTotalProgress = function (value) {
        if (value === void 0) { value = 0; }
        if (this.options.removeAfterUpload) {
            return value;
        }
        var notUploaded = this.getNotUploadedItems().length;
        var uploaded = notUploaded ? this.queue.length - notUploaded : this.queue.length;
        var ratio = 100 / this.queue.length;
        var current = value * ratio / 100;
        return Math.round(uploaded * ratio + current);
    };
    FileUploader.prototype._getFilters = function (filters) {
        if (!filters) {
            return this.options.filters;
        }
        if (Array.isArray(filters)) {
            return filters;
        }
        if (typeof filters === 'string') {
            var names_1 = filters.match(/[^\s,]+/g);
            return this.options.filters
                .filter(function (filter) { return names_1.indexOf(filter.name) !== -1; });
        }
        return this.options.filters;
    };
    FileUploader.prototype._render = function () {
        return void 0;
    };
    FileUploader.prototype._queueLimitFilter = function () {
        return this.options.queueLimit === undefined || this.queue.length < this.options.queueLimit;
    };
    FileUploader.prototype._isValidFile = function (file, filters, options) {
        var _this = this;
        this._failFilterIndex = -1;
        return !filters.length ? true : filters.every(function (filter) {
            _this._failFilterIndex++;
            return filter.fn.call(_this, file, options);
        });
    };
    FileUploader.prototype._isSuccessCode = function (status) {
        return (status >= 200 && status < 300) || status === 304;
    };
    FileUploader.prototype._transformResponse = function (response, headers) {
        return response;
    };
    FileUploader.prototype._parseHeaders = function (headers) {
        var parsed = {};
        var key;
        var val;
        var i;
        if (!headers) {
            return parsed;
        }
        headers.split('\n').map(function (line) {
            i = line.indexOf(':');
            key = line.slice(0, i).trim().toLowerCase();
            val = line.slice(i + 1).trim();
            if (key) {
                parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
            }
        });
        return parsed;
    };
    FileUploader.prototype._onWhenAddingFileFailed = function (item, filter, options) {
        this.onWhenAddingFileFailed(item, filter, options);
    };
    FileUploader.prototype._onAfterAddingFile = function (item) {
        this.onAfterAddingFile(item);
    };
    FileUploader.prototype._onAfterAddingAll = function (items) {
        this.onAfterAddingAll(items);
    };
    FileUploader.prototype._onBeforeUploadItem = function (item) {
        item._onBeforeUpload();
        this.onBeforeUploadItem(item);
    };
    FileUploader.prototype._onBuildItemForm = function (item, form) {
        item._onBuildForm(form);
        this.onBuildItemForm(item, form);
    };
    FileUploader.prototype._onProgressItem = function (item, progress) {
        var total = this._getTotalProgress(progress);
        this.progress = total;
        item._onProgress(progress);
        this.onProgressItem(item, progress);
        this.onProgressAll(total);
        this._render();
    };
    FileUploader.prototype._onSuccessItem = function (item, response, status, headers) {
        item._onSuccess(response, status, headers);
        this.onSuccessItem(item, response, status, headers);
    };
    FileUploader.prototype._onCancelItem = function (item, response, status, headers) {
        item._onCancel(response, status, headers);
        this.onCancelItem(item, response, status, headers);
    };
    return FileUploader;
}());
exports.FileUploader = FileUploader;


/***/ }),

/***/ "../../../../ng2-file-upload/index.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(__webpack_require__("../../../../ng2-file-upload/file-upload/file-select.directive.js"));
__export(__webpack_require__("../../../../ng2-file-upload/file-upload/file-drop.directive.js"));
__export(__webpack_require__("../../../../ng2-file-upload/file-upload/file-uploader.class.js"));
__export(__webpack_require__("../../../../ng2-file-upload/file-upload/file-item.class.js"));
__export(__webpack_require__("../../../../ng2-file-upload/file-upload/file-like-object.class.js"));
var file_upload_module_1 = __webpack_require__("../../../../ng2-file-upload/file-upload/file-upload.module.js");
exports.FileUploadModule = file_upload_module_1.FileUploadModule;


/***/ })

});
//# sourceMappingURL=product.module.chunk.js.map