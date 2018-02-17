webpackJsonp(["common"],{

/***/ "../../../../../src/app/shared/lib/priceFormatter.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = priceFormatter;
function priceFormatter(p) {
    var ret = '';
    (p + '').split('').reverse().forEach(function (digit, ind) {
        ret = (+digit).toLocaleString('fa') + ret;
        if (ind % 3 === 2 && ind !== Math.floor(Math.log10(p))) {
            ret = '٫' + ret;
        }
    });
    return ret;
}


/***/ }),

/***/ "../../../common/esm5/testing.js":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return SpyLocation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return MockLocationStrategy; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_tslib__ = __webpack_require__("../../../../tslib/tslib.es6.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_common__ = __webpack_require__("../../../common/esm5/common.js");
/**
 * @license Angular v5.2.3
 * (c) 2010-2018 Google, Inc. https://angular.io/
 * License: MIT
 */




/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * A spy for {\@link Location} that allows tests to fire simulated location events.
 *
 * \@experimental
 */
var SpyLocation = /** @class */ (function () {
    function SpyLocation() {
        this.urlChanges = [];
        this._history = [new LocationState('', '')];
        this._historyIndex = 0;
        /**
         * \@internal
         */
        this._subject = new __WEBPACK_IMPORTED_MODULE_0__angular_core__["EventEmitter"]();
        /**
         * \@internal
         */
        this._baseHref = '';
        /**
         * \@internal
         */
        this._platformStrategy = /** @type {?} */ ((null));
    }
    /**
     * @param {?} url
     * @return {?}
     */
    SpyLocation.prototype.setInitialPath = /**
     * @param {?} url
     * @return {?}
     */
    function (url) { this._history[this._historyIndex].path = url; };
    /**
     * @param {?} url
     * @return {?}
     */
    SpyLocation.prototype.setBaseHref = /**
     * @param {?} url
     * @return {?}
     */
    function (url) { this._baseHref = url; };
    /**
     * @return {?}
     */
    SpyLocation.prototype.path = /**
     * @return {?}
     */
    function () { return this._history[this._historyIndex].path; };
    /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    SpyLocation.prototype.isCurrentPathEqualTo = /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    function (path, query) {
        if (query === void 0) { query = ''; }
        var /** @type {?} */ givenPath = path.endsWith('/') ? path.substring(0, path.length - 1) : path;
        var /** @type {?} */ currPath = this.path().endsWith('/') ? this.path().substring(0, this.path().length - 1) : this.path();
        return currPath == givenPath + (query.length > 0 ? ('?' + query) : '');
    };
    /**
     * @param {?} pathname
     * @return {?}
     */
    SpyLocation.prototype.simulateUrlPop = /**
     * @param {?} pathname
     * @return {?}
     */
    function (pathname) {
        this._subject.emit({ 'url': pathname, 'pop': true, 'type': 'popstate' });
    };
    /**
     * @param {?} pathname
     * @return {?}
     */
    SpyLocation.prototype.simulateHashChange = /**
     * @param {?} pathname
     * @return {?}
     */
    function (pathname) {
        // Because we don't prevent the native event, the browser will independently update the path
        this.setInitialPath(pathname);
        this.urlChanges.push('hash: ' + pathname);
        this._subject.emit({ 'url': pathname, 'pop': true, 'type': 'hashchange' });
    };
    /**
     * @param {?} url
     * @return {?}
     */
    SpyLocation.prototype.prepareExternalUrl = /**
     * @param {?} url
     * @return {?}
     */
    function (url) {
        if (url.length > 0 && !url.startsWith('/')) {
            url = '/' + url;
        }
        return this._baseHref + url;
    };
    /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    SpyLocation.prototype.go = /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    function (path, query) {
        if (query === void 0) { query = ''; }
        path = this.prepareExternalUrl(path);
        if (this._historyIndex > 0) {
            this._history.splice(this._historyIndex + 1);
        }
        this._history.push(new LocationState(path, query));
        this._historyIndex = this._history.length - 1;
        var /** @type {?} */ locationState = this._history[this._historyIndex - 1];
        if (locationState.path == path && locationState.query == query) {
            return;
        }
        var /** @type {?} */ url = path + (query.length > 0 ? ('?' + query) : '');
        this.urlChanges.push(url);
        this._subject.emit({ 'url': url, 'pop': false });
    };
    /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    SpyLocation.prototype.replaceState = /**
     * @param {?} path
     * @param {?=} query
     * @return {?}
     */
    function (path, query) {
        if (query === void 0) { query = ''; }
        path = this.prepareExternalUrl(path);
        var /** @type {?} */ history = this._history[this._historyIndex];
        if (history.path == path && history.query == query) {
            return;
        }
        history.path = path;
        history.query = query;
        var /** @type {?} */ url = path + (query.length > 0 ? ('?' + query) : '');
        this.urlChanges.push('replace: ' + url);
    };
    /**
     * @return {?}
     */
    SpyLocation.prototype.forward = /**
     * @return {?}
     */
    function () {
        if (this._historyIndex < (this._history.length - 1)) {
            this._historyIndex++;
            this._subject.emit({ 'url': this.path(), 'pop': true });
        }
    };
    /**
     * @return {?}
     */
    SpyLocation.prototype.back = /**
     * @return {?}
     */
    function () {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            this._subject.emit({ 'url': this.path(), 'pop': true });
        }
    };
    /**
     * @param {?} onNext
     * @param {?=} onThrow
     * @param {?=} onReturn
     * @return {?}
     */
    SpyLocation.prototype.subscribe = /**
     * @param {?} onNext
     * @param {?=} onThrow
     * @param {?=} onReturn
     * @return {?}
     */
    function (onNext, onThrow, onReturn) {
        return this._subject.subscribe({ next: onNext, error: onThrow, complete: onReturn });
    };
    /**
     * @param {?} url
     * @return {?}
     */
    SpyLocation.prototype.normalize = /**
     * @param {?} url
     * @return {?}
     */
    function (url) { return /** @type {?} */ ((null)); };
    SpyLocation.decorators = [
        { type: __WEBPACK_IMPORTED_MODULE_0__angular_core__["Injectable"] },
    ];
    /** @nocollapse */
    SpyLocation.ctorParameters = function () { return []; };
    return SpyLocation;
}());
var LocationState = /** @class */ (function () {
    function LocationState(path, query) {
        this.path = path;
        this.query = query;
    }
    return LocationState;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * A mock implementation of {\@link LocationStrategy} that allows tests to fire simulated
 * location events.
 *
 * \@stable
 */
var MockLocationStrategy = /** @class */ (function (_super) {
    Object(__WEBPACK_IMPORTED_MODULE_1_tslib__["b" /* __extends */])(MockLocationStrategy, _super);
    function MockLocationStrategy() {
        var _this = _super.call(this) || this;
        _this.internalBaseHref = '/';
        _this.internalPath = '/';
        _this.internalTitle = '';
        _this.urlChanges = [];
        /**
         * \@internal
         */
        _this._subject = new __WEBPACK_IMPORTED_MODULE_0__angular_core__["EventEmitter"]();
        return _this;
    }
    /**
     * @param {?} url
     * @return {?}
     */
    MockLocationStrategy.prototype.simulatePopState = /**
     * @param {?} url
     * @return {?}
     */
    function (url) {
        this.internalPath = url;
        this._subject.emit(new _MockPopStateEvent(this.path()));
    };
    /**
     * @param {?=} includeHash
     * @return {?}
     */
    MockLocationStrategy.prototype.path = /**
     * @param {?=} includeHash
     * @return {?}
     */
    function (includeHash) {
        if (includeHash === void 0) { includeHash = false; }
        return this.internalPath;
    };
    /**
     * @param {?} internal
     * @return {?}
     */
    MockLocationStrategy.prototype.prepareExternalUrl = /**
     * @param {?} internal
     * @return {?}
     */
    function (internal) {
        if (internal.startsWith('/') && this.internalBaseHref.endsWith('/')) {
            return this.internalBaseHref + internal.substring(1);
        }
        return this.internalBaseHref + internal;
    };
    /**
     * @param {?} ctx
     * @param {?} title
     * @param {?} path
     * @param {?} query
     * @return {?}
     */
    MockLocationStrategy.prototype.pushState = /**
     * @param {?} ctx
     * @param {?} title
     * @param {?} path
     * @param {?} query
     * @return {?}
     */
    function (ctx, title, path, query) {
        this.internalTitle = title;
        var /** @type {?} */ url = path + (query.length > 0 ? ('?' + query) : '');
        this.internalPath = url;
        var /** @type {?} */ externalUrl = this.prepareExternalUrl(url);
        this.urlChanges.push(externalUrl);
    };
    /**
     * @param {?} ctx
     * @param {?} title
     * @param {?} path
     * @param {?} query
     * @return {?}
     */
    MockLocationStrategy.prototype.replaceState = /**
     * @param {?} ctx
     * @param {?} title
     * @param {?} path
     * @param {?} query
     * @return {?}
     */
    function (ctx, title, path, query) {
        this.internalTitle = title;
        var /** @type {?} */ url = path + (query.length > 0 ? ('?' + query) : '');
        this.internalPath = url;
        var /** @type {?} */ externalUrl = this.prepareExternalUrl(url);
        this.urlChanges.push('replace: ' + externalUrl);
    };
    /**
     * @param {?} fn
     * @return {?}
     */
    MockLocationStrategy.prototype.onPopState = /**
     * @param {?} fn
     * @return {?}
     */
    function (fn) { this._subject.subscribe({ next: fn }); };
    /**
     * @return {?}
     */
    MockLocationStrategy.prototype.getBaseHref = /**
     * @return {?}
     */
    function () { return this.internalBaseHref; };
    /**
     * @return {?}
     */
    MockLocationStrategy.prototype.back = /**
     * @return {?}
     */
    function () {
        if (this.urlChanges.length > 0) {
            this.urlChanges.pop();
            var /** @type {?} */ nextUrl = this.urlChanges.length > 0 ? this.urlChanges[this.urlChanges.length - 1] : '';
            this.simulatePopState(nextUrl);
        }
    };
    /**
     * @return {?}
     */
    MockLocationStrategy.prototype.forward = /**
     * @return {?}
     */
    function () { throw 'not implemented'; };
    MockLocationStrategy.decorators = [
        { type: __WEBPACK_IMPORTED_MODULE_0__angular_core__["Injectable"] },
    ];
    /** @nocollapse */
    MockLocationStrategy.ctorParameters = function () { return []; };
    return MockLocationStrategy;
}(__WEBPACK_IMPORTED_MODULE_2__angular_common__["LocationStrategy"]));
var _MockPopStateEvent = /** @class */ (function () {
    function _MockPopStateEvent(newUrl) {
        this.newUrl = newUrl;
        this.pop = true;
        this.type = 'popstate';
    }
    return _MockPopStateEvent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @module
 * @description
 * Entry point for all public APIs of this package.
 */

// This file only reexports content of the `src` folder. Keep it that way.

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Generated bundle index. Do not edit.
 */


//# sourceMappingURL=testing.js.map


/***/ }),

/***/ "../../../router/esm5/testing.js":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export SpyNgModuleFactoryLoader */
/* unused harmony export setupTestingRouter */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return RouterTestingModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_common__ = __webpack_require__("../../../common/esm5/common.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_common_testing__ = __webpack_require__("../../../common/esm5/testing.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/**
 * @license Angular v5.2.3
 * (c) 2010-2018 Google, Inc. https://angular.io/
 * License: MIT
 */





/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@whatItDoes Allows to simulate the loading of ng modules in tests.
 *
 * \@howToUse
 *
 * ```
 * const loader = TestBed.get(NgModuleFactoryLoader);
 *
 * \@Component({template: 'lazy-loaded'})
 * class LazyLoadedComponent {}
 * \@NgModule({
 *   declarations: [LazyLoadedComponent],
 *   imports: [RouterModule.forChild([{path: 'loaded', component: LazyLoadedComponent}])]
 * })
 *
 * class LoadedModule {}
 *
 * // sets up stubbedModules
 * loader.stubbedModules = {lazyModule: LoadedModule};
 *
 * router.resetConfig([
 *   {path: 'lazy', loadChildren: 'lazyModule'},
 * ]);
 *
 * router.navigateByUrl('/lazy/loaded');
 * ```
 *
 * \@stable
 */
var SpyNgModuleFactoryLoader = /** @class */ (function () {
    function SpyNgModuleFactoryLoader(compiler) {
        this.compiler = compiler;
        /**
         * \@docsNotRequired
         */
        this._stubbedModules = {};
    }
    Object.defineProperty(SpyNgModuleFactoryLoader.prototype, "stubbedModules", {
        /**
         * @docsNotRequired
         */
        get: /**
         * \@docsNotRequired
         * @return {?}
         */
        function () { return this._stubbedModules; },
        /**
         * @docsNotRequired
         */
        set: /**
         * \@docsNotRequired
         * @param {?} modules
         * @return {?}
         */
        function (modules) {
            var /** @type {?} */ res = {};
            for (var _i = 0, _a = Object.keys(modules); _i < _a.length; _i++) {
                var t = _a[_i];
                res[t] = this.compiler.compileModuleAsync(modules[t]);
            }
            this._stubbedModules = res;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @param {?} path
     * @return {?}
     */
    SpyNgModuleFactoryLoader.prototype.load = /**
     * @param {?} path
     * @return {?}
     */
    function (path) {
        if (this._stubbedModules[path]) {
            return this._stubbedModules[path];
        }
        else {
            return /** @type {?} */ (Promise.reject(new Error("Cannot find module " + path)));
        }
    };
    SpyNgModuleFactoryLoader.decorators = [
        { type: __WEBPACK_IMPORTED_MODULE_2__angular_core__["Injectable"] },
    ];
    /** @nocollapse */
    SpyNgModuleFactoryLoader.ctorParameters = function () { return [
        { type: __WEBPACK_IMPORTED_MODULE_2__angular_core__["Compiler"], },
    ]; };
    return SpyNgModuleFactoryLoader;
}());
/**
 * @param {?} opts
 * @return {?}
 */
function isUrlHandlingStrategy(opts) {
    // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
    // runtime.
    return 'shouldProcessUrl' in opts;
}
/**
 * Router setup factory function used for testing.
 *
 * \@stable
 * @param {?} urlSerializer
 * @param {?} contexts
 * @param {?} location
 * @param {?} loader
 * @param {?} compiler
 * @param {?} injector
 * @param {?} routes
 * @param {?=} opts
 * @param {?=} urlHandlingStrategy
 * @return {?}
 */
function setupTestingRouter(urlSerializer, contexts, location, loader, compiler, injector, routes, opts, urlHandlingStrategy) {
    var /** @type {?} */ router = new __WEBPACK_IMPORTED_MODULE_3__angular_router__["g" /* Router */](/** @type {?} */ ((null)), urlSerializer, contexts, location, injector, loader, compiler, Object(__WEBPACK_IMPORTED_MODULE_3__angular_router__["m" /* ɵflatten */])(routes));
    // Handle deprecated argument ordering.
    if (opts) {
        if (isUrlHandlingStrategy(opts)) {
            router.urlHandlingStrategy = opts;
        }
        else if (opts.paramsInheritanceStrategy) {
            router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
        }
    }
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    return router;
}
/**
 * \@whatItDoes Sets up the router to be used for testing.
 *
 * \@howToUse
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestModule({
 *     imports: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * \@description
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of {\@link Location}, {\@link LocationStrategy}, and {\@link
 * NgModuleFactoryLoader}.
 *
 * \@stable
 */
var RouterTestingModule = /** @class */ (function () {
    function RouterTestingModule() {
    }
    /**
     * @param {?} routes
     * @param {?=} config
     * @return {?}
     */
    RouterTestingModule.withRoutes = /**
     * @param {?} routes
     * @param {?=} config
     * @return {?}
     */
    function (routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                Object(__WEBPACK_IMPORTED_MODULE_3__angular_router__["k" /* provideRoutes */])(routes),
                { provide: __WEBPACK_IMPORTED_MODULE_3__angular_router__["e" /* ROUTER_CONFIGURATION */], useValue: config ? config : {} },
            ]
        };
    };
    RouterTestingModule.decorators = [
        { type: __WEBPACK_IMPORTED_MODULE_2__angular_core__["NgModule"], args: [{
                    exports: [__WEBPACK_IMPORTED_MODULE_3__angular_router__["h" /* RouterModule */]],
                    providers: [
                        __WEBPACK_IMPORTED_MODULE_3__angular_router__["l" /* ɵROUTER_PROVIDERS */], { provide: __WEBPACK_IMPORTED_MODULE_0__angular_common__["Location"], useClass: __WEBPACK_IMPORTED_MODULE_1__angular_common_testing__["b" /* SpyLocation */] },
                        { provide: __WEBPACK_IMPORTED_MODULE_0__angular_common__["LocationStrategy"], useClass: __WEBPACK_IMPORTED_MODULE_1__angular_common_testing__["a" /* MockLocationStrategy */] },
                        { provide: __WEBPACK_IMPORTED_MODULE_2__angular_core__["NgModuleFactoryLoader"], useClass: SpyNgModuleFactoryLoader }, {
                            provide: __WEBPACK_IMPORTED_MODULE_3__angular_router__["g" /* Router */],
                            useFactory: setupTestingRouter,
                            deps: [
                                __WEBPACK_IMPORTED_MODULE_3__angular_router__["j" /* UrlSerializer */], __WEBPACK_IMPORTED_MODULE_3__angular_router__["b" /* ChildrenOutletContexts */], __WEBPACK_IMPORTED_MODULE_0__angular_common__["Location"], __WEBPACK_IMPORTED_MODULE_2__angular_core__["NgModuleFactoryLoader"], __WEBPACK_IMPORTED_MODULE_2__angular_core__["Compiler"], __WEBPACK_IMPORTED_MODULE_2__angular_core__["Injector"],
                                __WEBPACK_IMPORTED_MODULE_3__angular_router__["f" /* ROUTES */], __WEBPACK_IMPORTED_MODULE_3__angular_router__["e" /* ROUTER_CONFIGURATION */], [__WEBPACK_IMPORTED_MODULE_3__angular_router__["i" /* UrlHandlingStrategy */], new __WEBPACK_IMPORTED_MODULE_2__angular_core__["Optional"]()]
                            ]
                        },
                        { provide: __WEBPACK_IMPORTED_MODULE_3__angular_router__["d" /* PreloadingStrategy */], useExisting: __WEBPACK_IMPORTED_MODULE_3__angular_router__["c" /* NoPreloading */] }, Object(__WEBPACK_IMPORTED_MODULE_3__angular_router__["k" /* provideRoutes */])([])
                    ]
                },] },
    ];
    /** @nocollapse */
    RouterTestingModule.ctorParameters = function () { return []; };
    return RouterTestingModule;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @module
 * @description
 * Entry point for all public APIs of the router/testing package.
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @module
 * @description
 * Entry point for all public APIs of this package.
 */

// This file only reexports content of the `src` folder. Keep it that way.

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Generated bundle index. Do not edit.
 */


//# sourceMappingURL=testing.js.map


/***/ })

});
//# sourceMappingURL=common.chunk.js.map