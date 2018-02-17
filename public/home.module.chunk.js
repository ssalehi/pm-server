webpackJsonp(["home.module"],{

/***/ "../../../../../src/app/site/home/components/home.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "\r\n/* Container holding the image and the text */\r\n.container {\r\n    position: relative;\r\n    text-align: center;\r\n    color: white;\r\n    width: 100%;\r\n}\r\n/*Alignment based on horizontal-vertical align*/\r\n/* Bottom left text */\r\n.left-top {\r\n    position: absolute;\r\n    bottom: 67%;\r\n    left: 2%;\r\n    text-align: left;\r\n}\r\n/* Bottom left text */\r\n.left-center {\r\n    position: absolute;\r\n    bottom: 33.33%;\r\n    left: 2%;\r\n    text-align: left;\r\n}\r\n/* Center left text */\r\n.left-bottom {\r\n    position: absolute;\r\n    bottom: 10%;\r\n    left: 2%;\r\n    text-align: left;\r\n}\r\n/* Top left text */\r\n.center-top {\r\n    position: absolute;\r\n    bottom: 67%;\r\n    left: 50%;\r\n}\r\n/* Top right text */\r\n.center-center {\r\n    position: absolute;\r\n    bottom: 33.33%;\r\n    left: 50%;\r\n}\r\n/* Bottom right text */\r\n.center-bottom {\r\n    position: absolute;\r\n    bottom: 10%;\r\n    left: 50%;\r\n}\r\n.right-top {\r\n    position: absolute;\r\n    bottom: 67%;\r\n    right: 2%;\r\n    text-align: right;\r\n}\r\n.right-center {\r\n    position: absolute;\r\n    bottom: 33.33%;\r\n    right: 2%;\r\n    text-align: right;\r\n}\r\n.right-bottom {\r\n    position: absolute;\r\n    bottom: 10%;\r\n    right: 2%;\r\n    text-align: right;\r\n}\r\n.default-color {\r\n    color: white;\r\n}\r\n.sub-title {\r\n    white-space: nowrap;\r\n    text-align: right;\r\n    margin-right: 15px\r\n}\r\n/* Centered text */\r\n.centered {\r\n    position: absolute;\r\n    top: 50%;\r\n    left: 50%;\r\n    -webkit-transform: translate(-50%, -50%);\r\n            transform: translate(-50%, -50%);\r\n    /*z-index: 1000;*/\r\n    font-weight: bolder;\r\n}\r\n.shop-button {\r\n    color: black;\r\n    font-size: large ;\r\n    font-family: 'irankharazmi';\r\n    font-weight: bolder;\r\n}\r\n.full-width {\r\n    width: 100%;\r\n    margin-top: -9px;\r\n}\r\n.top-title {\r\n     text-align: right;\r\n     margin-right: 35px\r\n}\r\n.h2-sub-title {\r\n    text-align: right;\r\n    margin-right: 10px\r\n}\r\n.title-mobile {\r\n    color: black;\r\n    font-weight: bolder;\r\n    text-align: center;\r\n    margin-top: 0px;\r\n}\r\n.shop-button-mobile{\r\n    color: black;\r\n    font-size: medium ;\r\n    font-family: 'irankharazmi';\r\n    font-weight: bold;\r\n}\r\n", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/site/home/components/home.component.html":
/***/ (function(module, exports) {

module.exports = "<div *ngIf=\"curWidth >= 960\" class=\"full-width\">\r\n    <div *ngFor=\"let item of placements.panels\" class=\"container\">\r\n        <h2 *ngIf=\"item.topTitle  && (item.mobileMode === undefined || item.mobileMode === false)\"\r\n            [style.color]=\"item.topTitle.color ? item.topTitle.color : null\" class=\"top-title\">\r\n            {{item.topTitle.title}}</h2>\r\n        <div *ngIf=\"item.mobileMode === undefined || item.mobileMode === false\" fxLayout=\"row\"\r\n             fxLayoutAlign=\"cente center\" [style.margin-right]=\"item.type !== 'full' ? '15px' : null\"\r\n             [style.margin-left]=\"item.type !== 'full' ? '15px' : null\">\r\n            <div [fxFlex]=\"100/item.imgs.length\" *ngFor=\"let im of item.imgs\">\r\n                <a href=\"{{im.href}}\">\r\n                    <img src=\"{{im.imgUrl}}\" class=\"full-width\"/>\r\n                </a>\r\n                <div *ngFor=\"let ar of im.areas\">\r\n                    <div [style.font-size]=\"(item.type === 'full' && item.imgs[0].areas.length === 1)  ? '1.5em' : '0.9em'\"\r\n                         [ngClass]=\"ar.pos\">\r\n                        <h1 *ngIf=\"ar.title\" [style.color]=\"ar.color ? ar.color : null\">{{ar.title}}</h1>\r\n                        <div *ngIf=\"ar.text\" [style.color]=\"ar.color ? ar.color : null\"><b>{{ar.text}}</b></div>\r\n                        <div *ngIf=\"ar.title\" style=\"margin-top: 5%;\">\r\n                            <button mat-raised-button color=\"accent\" class=\"shop-button\">\r\n                                <b>خرید آنلاین</b>\r\n                            </button>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n                <div *ngIf=\"im.subTitle\" [style.color]=\"im.subTitle.color ? im.subTitle.color : null\" class=\"sub-title\">\r\n                    <b>{{im.subTitle.title}}</b></div>\r\n                <div *ngIf=\"im.subTitle\" [style.color]=\"im.subTitle.textColor ? im.subTitle.textColor : null\"\r\n                     class=\"sub-title\">{{im.subTitle.text}}\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <h2 *ngIf=\"item.subTitle && (item.mobileMode === undefined || item.mobileMode === false)\"\r\n            [style.color]=\"item.subTitle.color ? item.subTitle.color : null\" class=\"h2-sub-title\">\r\n            {{item.subTitle.title}}</h2>\r\n    </div>\r\n</div>\r\n<div *ngIf=\"curWidth < 960\">\r\n    <div *ngFor=\"let item of placements.panels\" class=\"container\">\r\n        <h2 *ngIf=\"item.topTitle  && (item.mobileMode === undefined || item.mobileMode === true)\" class=\"title-mobile\"\r\n            style=\"margin-bottom: 0px;\">{{item.topTitle.title}}</h2>\r\n        <div *ngIf=\"item.mobileMode === undefined || item.mobileMode === true\" fxLayout=\"row\"\r\n             fxLayoutAlign=\"cente center\" fxLayout.sm=\"column\" fxLayout.xs=\"column\">\r\n            <div [fxFlex]=\"100\" *ngFor=\"let im of item.imgs\">\r\n                <a href=\"{{im.href}}\">\r\n                    <img src=\"{{im.imgUrl}}\" class=\"full-width\"/>\r\n                </a>\r\n                <div *ngFor=\"let ar of im.areas\">\r\n                    <h2 *ngIf=\"ar.title\" class=\"title-mobile\" style=\"margin-bottom: 30px;margin-top: 0px;\">\r\n                        {{ar.title}}</h2>\r\n                </div>\r\n                <div *ngIf=\"im.subTitle\" class=\"title-mobile\"><b>{{im.subTitle.title}}</b></div>\r\n                <div *ngIf=\"im.subTitle\" class=\"title-mobile\" style=\"margin-bottom: 25px; color: gray;\">{{im.subTitle.text}}</div>\r\n            </div>\r\n        </div>\r\n        <h2 *ngIf=\"item.subTitle && (item.mobileMode === undefined || item.mobileMode === true)\" class=\"h2-sub-title\">\r\n            {{item.subTitle.title}}</h2>\r\n    </div>\r\n</div>\r\n"

/***/ }),

/***/ "../../../../../src/app/site/home/components/home.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return HomeComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__shared_services_window_service__ = __webpack_require__("../../../../../src/app/shared/services/window.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__shared_services_auth_service__ = __webpack_require__("../../../../../src/app/shared/services/auth.service.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var HomeComponent = /** @class */ (function () {
    function HomeComponent(window, authService) {
        this.window = window;
        this.authService = authService;
        this.curWidth = 100;
        this.curHeight = 100;
        this.placements = {
            panels: [
                {
                    type: 'full',
                    topTitle: {
                        title: '',
                        text: '',
                        color: '',
                    },
                    subTitle: {
                        title: '',
                        text: '',
                        color: '',
                    },
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/pm-1.png',
                            href: '#',
                            topTitle: {
                                title: '',
                                text: '',
                                color: '',
                                textColor: ''
                            },
                            subTitle: {
                                title: '',
                                text: '',
                                color: '',
                                textColor: '',
                            },
                            areas: [
                                {
                                    pos: 'left-center',
                                    title: 'متفاوت باش!',
                                    text: 'حرکت رو به جلو ...',
                                },
                            ],
                        },
                    ]
                },
                {
                    type: 'full',
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/pm-2.png',
                            href: '#',
                            areas: [
                                {
                                    pos: 'right-center',
                                    title: 'مثل همیشه، فراتر از زمان!',
                                    text: 'معرفی محصولات جدید نایک پلاس',
                                    color: 'black',
                                },
                            ],
                        },
                    ]
                },
                {
                    type: 'full',
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/pm-7.png',
                            href: '#',
                            areas: [
                                {
                                    pos: 'left-center',
                                    title: 'طوسی بی نظیر!',
                                    text: 'برای اولین بار',
                                },
                            ],
                        },
                    ]
                },
                {
                    mobileMode: false,
                    type: 'full',
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/pm-4.png',
                            href: '#',
                            areas: [
                                {
                                    pos: 'left-center',
                                    title: 'کاملا گرم',
                                    text: 'محصولات پشمی مناسب زمستان',
                                }, {
                                    pos: 'right-center',
                                    title: 'زمان درخشیدن توست!',
                                    text: 'نایک، حامی تیم ملی در طول بازیها',
                                },
                            ],
                        },
                    ]
                },
                {
                    mobileMode: true,
                    type: 'half',
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/half-1.png',
                            href: '#',
                            areas: [{
                                    pos: 'left-center',
                                    title: 'کاملا گرم',
                                    text: 'محصولات پشمی مناسب زمستان',
                                },
                            ]
                        },
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/half-2.png',
                            href: '#',
                            areas: [
                                {
                                    pos: 'right-center',
                                    title: 'زمان درخشیدن توست!',
                                    text: 'نایک، حامی تیم ملی در طول بازیها',
                                },
                            ],
                        },
                    ]
                },
                {
                    type: 'quarter',
                    topTitle: {
                        title: 'رنگهای جدید، دلخواه شما',
                        text: '',
                        color: 'black',
                    },
                    imgs: [
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/q1.png',
                            href: '#',
                            subTitle: {
                                title: 'کفش راحتی زنانه، مدل ژاکلین',
                                text: 'کفش زنانه',
                                color: 'black',
                                textColor: 'gray',
                            },
                            areas: [],
                        },
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/q2.png',
                            href: '#',
                            subTitle: {
                                title: 'کفش کارمندی زنانه',
                                text: 'کفش زنانه',
                                color: 'black',
                                textColor: 'gray',
                            },
                            areas: [],
                        },
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/q3.png',
                            href: '#',
                            subTitle: {
                                title: 'کفش ورزشی زنانه نایک، سری نایک پلاس',
                                text: 'کفش ورزشی زنانه',
                                color: 'black',
                                textColor: 'gray',
                            },
                            areas: [],
                        },
                        {
                            imgUrl: '../../../../assets/pictures/nike-first-page-pic/q4.png',
                            href: '#',
                            subTitle: {
                                title: 'کفش پیاده روی زنانه نایک، مدل پگاسوس',
                                text: 'کفش پیاده روی زنانه',
                                color: 'black',
                                textColor: 'gray'
                            },
                            areas: [],
                        },
                    ]
                },
            ]
        };
    }
    HomeComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.curWidth = this.window.innerWidth;
        this.curHeight = this.window.innerHeight;
        this.window.onresize = function (e) {
            _this.curWidth = _this.window.innerWidth;
            _this.curHeight = _this.window.innerHeight;
        };
    };
    HomeComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Component"])({
            selector: 'app-home',
            template: __webpack_require__("../../../../../src/app/site/home/components/home.component.html"),
            styles: [__webpack_require__("../../../../../src/app/site/home/components/home.component.css")]
        }),
        __param(0, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["Inject"])(__WEBPACK_IMPORTED_MODULE_1__shared_services_window_service__["a" /* WINDOW */])),
        __metadata("design:paramtypes", [Object, __WEBPACK_IMPORTED_MODULE_2__shared_services_auth_service__["a" /* AuthService */]])
    ], HomeComponent);
    return HomeComponent;
}());



/***/ }),

/***/ "../../../../../src/app/site/home/home.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "HomeModule", function() { return HomeModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_home_component__ = __webpack_require__("../../../../../src/app/site/home/components/home.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__home_routing__ = __webpack_require__("../../../../../src/app/site/home/home.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_common__ = __webpack_require__("../../../common/esm5/common.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__angular_flex_layout__ = __webpack_require__("../../../flex-layout/esm5/flex-layout.es5.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};






var HomeModule = /** @class */ (function () {
    function HomeModule() {
    }
    HomeModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["NgModule"])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_1__components_home_component__["a" /* HomeComponent */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_2__home_routing__["a" /* HomeRouting */],
                __WEBPACK_IMPORTED_MODULE_3__angular_common__["CommonModule"],
                __WEBPACK_IMPORTED_MODULE_4__angular_material__["b" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_4__angular_material__["h" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_5__angular_flex_layout__["a" /* FlexLayoutModule */],
            ],
        })
    ], HomeModule);
    return HomeModule;
}());



/***/ }),

/***/ "../../../../../src/app/site/home/home.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return HomeRouting; });
/* unused harmony export HomeTestRouting */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_home_component__ = __webpack_require__("../../../../../src/app/site/home/components/home.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_router_testing__ = __webpack_require__("../../../router/esm5/testing.js");



var Home_ROUTES = [
    { path: '', component: __WEBPACK_IMPORTED_MODULE_1__components_home_component__["a" /* HomeComponent */], pathMatch: 'full' },
];
var HomeRouting = __WEBPACK_IMPORTED_MODULE_0__angular_router__["h" /* RouterModule */].forChild(Home_ROUTES);
var HomeTestRouting = __WEBPACK_IMPORTED_MODULE_2__angular_router_testing__["a" /* RouterTestingModule */].withRoutes(Home_ROUTES);


/***/ })

});
//# sourceMappingURL=home.module.chunk.js.map