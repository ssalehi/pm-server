webpackJsonp(["collections.module"],{

/***/ "../../../../../src/app/admin/collections/collections.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".card-view {\r\n  margin: 10px;\r\n  -webkit-box-shadow: 10px 10px 80px grey;\r\n          box-shadow: 10px 10px 80px grey;\r\n  /*border: 1px solid gray;*/\r\n}\r\n", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/collections/collections.component.html":
/***/ (function(module, exports) {

module.exports = "<div fxLayout=\"row\" class=\"row\">\r\n  <button mat-fab color=\"accent\" (click)=\"openForm()\">\r\n    <mat-icon aria-label=\"Add new Expertise\">add</mat-icon>\r\n  </button>\r\n</div>\r\n<div *ngFor=\"let r of rows\">\r\n  <div fxLayout=\"row\" fxLayout.sm=\"column\" fxLayout.xs=\"column\" fxLayoutAlign=\"start start\" fxLayoutAlign.sm=\"center center\" fxLayoutAlign.xs=\"center center\" class=\"row\">\r\n    <div fxFlex=\"25\" *ngFor=\"let c of r\" class=\"outer-card\">\r\n      <mat-card class=\"card-view\" (click)=\"select(c.id)\" [ngClass]=\"{'mat-elevation-z24': c.id == selectedId}\">\r\n        <img mat-card-image src=\"{{c.image_url.url}}\" alt=\"{{c.image_url.alt}}\">\r\n        <mat-card-header>\r\n          <mat-card-title>\r\n            <label class=\"name\">{{c.name}}</label>\r\n          </mat-card-title>\r\n          <mat-card-subtitle>\r\n\r\n          </mat-card-subtitle>\r\n        </mat-card-header>\r\n        <hr>\r\n        <mat-card-content>\r\n          <div *ngFor=\"let p of c.products\">\r\n            {{p.name}}\r\n          </div>\r\n        </mat-card-content>\r\n        <mat-card-actions>\r\n          <button mat-icon-button (click)=\"openView(c.id)\" color=\"primary\">\r\n            <mat-icon aria-label=\"view\">visibility</mat-icon>\r\n          </button>\r\n          <button mat-icon-button (click)=\"openForm(c.id)\" color=\"accent\">\r\n            <mat-icon aria-label=\"edit\">edit</mat-icon>\r\n          </button>\r\n          <button mat-icon-button (click)=\"deleteCollection(c.id)\" color=\"warn\">\r\n            <mat-icon aria-label=\"delete\">delete</mat-icon>\r\n          </button>\r\n        </mat-card-actions>\r\n      </mat-card>\r\n    </div>\r\n  </div>\r\n</div>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/collections/collections.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CollectionsComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__shared_services_http_service__ = __webpack_require__("../../../../../src/app/shared/services/http.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



;
var CollectionsComponent = /** @class */ (function () {
    function CollectionsComponent(httpService, router) {
        this.httpService = httpService;
        this.router = router;
        this.collections = [];
        this.selectedId = null;
        this.rows = [];
    }
    CollectionsComponent.prototype.ngOnInit = function () {
        this.searching();
    };
    CollectionsComponent.prototype.searching = function () {
        var _this = this;
        // this.authService.getAllCollections().subscribe(
        this.httpService.getMockCollections().subscribe(function (data) {
            data = data.body.collections;
            for (var d in data) {
                var col = {
                    id: data[d].id,
                    name: data[d].name,
                    image_url: {
                        url: data[d].image_url.url,
                        alt: data[d].image_url.alt
                    },
                    products: [],
                };
                col['products'] = [];
                for (var p in data[d].products) {
                    col['products'].push({
                        name: data[d].products[p].name
                    });
                }
                _this.collections.push(col);
            }
            console.log(_this.collections);
            _this.alignRow();
        });
    };
    CollectionsComponent.prototype.alignRow = function () {
        // TODO: should be multiple per row not all in one row - after paginator added
        this.rows.push(this.collections);
    };
    CollectionsComponent.prototype.select = function (id) {
        if (this.selectedId === id) {
            this.selectedId = null;
        }
        else {
            this.selectedId = id;
        }
    };
    CollectionsComponent.prototype.openForm = function (id) {
        if (id === void 0) { id = null; }
        this.router.navigate(["/agent/collections/form/" + id]);
    };
    CollectionsComponent.prototype.openView = function (id) {
        if (id === void 0) { id = null; }
    };
    CollectionsComponent.prototype.deleteCollection = function (id) {
        if (id === void 0) { id = null; }
    };
    CollectionsComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-collections',
            template: __webpack_require__("../../../../../src/app/admin/collections/collections.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/collections/collections.component.css")]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1__shared_services_http_service__["a" /* HttpService */],
            __WEBPACK_IMPORTED_MODULE_2__angular_router__["g" /* Router */]])
    ], CollectionsComponent);
    return CollectionsComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/collections/collections.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CollectionsModule", function() { return CollectionsModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_common__ = __webpack_require__("../../../common/esm5/common.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__collections_component__ = __webpack_require__("../../../../../src/app/admin/collections/collections.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__collections_routing__ = __webpack_require__("../../../../../src/app/admin/collections/collections.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_view_view_component__ = __webpack_require__("../../../../../src/app/admin/collections/components/view/view.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__angular_flex_layout__ = __webpack_require__("../../../flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_form_form_component__ = __webpack_require__("../../../../../src/app/admin/collections/components/form/form.component.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};








var CollectionsModule = /** @class */ (function () {
    function CollectionsModule() {
    }
    CollectionsModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["NgModule"])({
            imports: [
                __WEBPACK_IMPORTED_MODULE_1__angular_common__["CommonModule"],
                __WEBPACK_IMPORTED_MODULE_3__collections_routing__["a" /* CollectionsRouting */],
                __WEBPACK_IMPORTED_MODULE_5__angular_material__["h" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_5__angular_material__["b" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_6__angular_flex_layout__["a" /* FlexLayoutModule */],
                __WEBPACK_IMPORTED_MODULE_5__angular_material__["c" /* MatCardModule */],
            ],
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__collections_component__["a" /* CollectionsComponent */],
                __WEBPACK_IMPORTED_MODULE_4__components_view_view_component__["a" /* ViewComponent */],
                __WEBPACK_IMPORTED_MODULE_7__components_form_form_component__["a" /* FormComponent */],
            ]
        })
    ], CollectionsModule);
    return CollectionsModule;
}());



/***/ }),

/***/ "../../../../../src/app/admin/collections/collections.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CollectionsRouting; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__collections_component__ = __webpack_require__("../../../../../src/app/admin/collections/collections.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_view_view_component__ = __webpack_require__("../../../../../src/app/admin/collections/components/view/view.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_form_form_component__ = __webpack_require__("../../../../../src/app/admin/collections/components/form/form.component.ts");




var Collections_ROUTES = [
    { path: '', component: __WEBPACK_IMPORTED_MODULE_1__collections_component__["a" /* CollectionsComponent */], pathMatch: 'full' },
    { path: ':id', component: __WEBPACK_IMPORTED_MODULE_2__components_view_view_component__["a" /* ViewComponent */] },
    { path: 'form/:id', component: __WEBPACK_IMPORTED_MODULE_3__components_form_form_component__["a" /* FormComponent */] },
];
var CollectionsRouting = __WEBPACK_IMPORTED_MODULE_0__angular_router__["h" /* RouterModule */].forChild(Collections_ROUTES);


/***/ }),

/***/ "../../../../../src/app/admin/collections/components/form/form.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/collections/components/form/form.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\r\n  form works!!!\r\n</p>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/collections/components/form/form.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return FormComponent; });
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

var FormComponent = /** @class */ (function () {
    function FormComponent() {
    }
    FormComponent.prototype.ngOnInit = function () {
    };
    FormComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-form',
            template: __webpack_require__("../../../../../src/app/admin/collections/components/form/form.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/collections/components/form/form.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], FormComponent);
    return FormComponent;
}());



/***/ }),

/***/ "../../../../../src/app/admin/collections/components/view/view.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/admin/collections/components/view/view.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\r\n  view works!\r\n</p>\r\n"

/***/ }),

/***/ "../../../../../src/app/admin/collections/components/view/view.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ViewComponent; });
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

var ViewComponent = /** @class */ (function () {
    function ViewComponent() {
    }
    ViewComponent.prototype.ngOnInit = function () {
    };
    ViewComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-view',
            template: __webpack_require__("../../../../../src/app/admin/collections/components/view/view.component.html"),
            styles: [__webpack_require__("../../../../../src/app/admin/collections/components/view/view.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], ViewComponent);
    return ViewComponent;
}());



/***/ })

});
//# sourceMappingURL=collections.module.chunk.js.map