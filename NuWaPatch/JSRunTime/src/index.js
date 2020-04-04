//将当期执行环境设置为全局对象
var global = this;
//使用匿名立即执行函数创建作用域，防止外部方位变量，造成变量污染
(function(){
    /**
     * 全局变量名
     */
    //全局字典
    var _nativeCls = {};

     /**
     * 公共方法
     */
    //将OC对象格式化成js对象
    var _formatNativeToJS = function(obj) {
        if (obj === undefined || obj === null) return false;

        if (typeof obj == "object") {
            if (obj.__obj) return obj;
            if (obj.__isNil) return false;
        }

        if (obj instanceof Array) {
            var ret = [];
            //每个元素递归迭代进行格式化
            obj.forEach(function(o){
                ret.push(_formatNativeToJS(o));
            });
            return ret;
        }

        if (obj instanceof Object) {
            var ret = [];
            for (var key in obj) {
                ret[key] = _formatNativeToJS(obj[key]);
            }
            return ret;
        }
    }

     /**
     * 1.导入需要热修复类
     */
    var _require = function(clsName) {
        if (!global[clsName]) {
            global[clsName] = {
                __clsName:clsName
            }
        }
        return global[clsName];
    }

    global.require = function() {
        var lastRequire;
        //遍历参数
        for(var i = 0; i < arguments.length; i++) {
            arguments[i].split(',').forEach(function(clsName) {
                lastRequire = _require(clsName.trim());
            });
        }
        return lastRequire;
    }
    
     /**
     * 2.向js对象定义_c元函数
     */
    var _methodFunc = function(instance, clsName, methodName, args) {
        var selectorName = methodName;
        //方法命名规则
        //(1)“__”代替“-”
        //(2)"_" 代替":""
        //(3)"-"代替 "_"
        methodName = methodName.replace(/__/g,'-');
        selectorName = methodName.replace(/_/g,':').replace(/-/g,'_');
        var matchArry = selectorName.match(/:/g);
        var numOfArgs = matchArry ? matchArry.length : 0;
        if (args.length > numOfArgs) {
            selectorName += ':';
        }
        //调用客户端原生方法
        var ret = instance ? _Native_callI(instance, selectorName, args): _Native_callC(clsName, selectorName, args);
        return ret;
    }

    var _customMethods = {
        __c: function(methodName) {
            var slf = this;
            if (slf instanceof Boolean) {
                return function() {
                    return false;
                }
            }

            if (slf[methodName]) {
                return self[methodName].bind(slf);
            }

            var clsName = slf.__clsName;
            if (clsName && _nativeCls[clsName]) {
                var methodType = slf.__obj ? 'instMethods' : 'clsMethods';
                if (_nativeCls[clsName][methodType][methodName]) {
                    return _nativeCls[clsName][methodType][methodName].bind(slf);
                }
            }

            return function() {
                var args = Array.prototype.slice.call(arguments);
                return _methodFunc(slf.__obj, slf.__clsName, methodName, args);
            }
        }
    }

    for (var method in _customMethods) {
        if (_customMethods.hasOwnProperty(method)) {
            //向JS对象原型添加自定义方法
            Object.defineProperty(Object.prototype, method, {value:_customMethods[method], configurable:false, enumerable:false});
        }
    }
     
    /**
     * 3.定义替换类的属性、 实例方法、类方法
     */
    //对替换的方法进行包装，供后面使用
    var _wrapLocalMethod = function(func, realClsName) {
        return function() {
            var lastSelf = global.self;
            global.self = this;
            this.__realClsName = realClsName;
            var ret = func.apply(this, arguments);
            global.self = lastSelf;
            return ret;
        }
    }

    var _setupJSMethod = function(className, methods, isInst, realClsName) {
        for (var methodName in methods) {
            var key = isInst ? 'instMethods' : 'clsMethods';
            func = methods[methodName];
            _nativeCls[className][key][methodName] = _wrapLocalMethod(func, realClsName);
        }
    }

    var _formatDefineMethods = function(methods, newMethods, realClsName) {
        for (var methodName in methods) {
            if (!(methods[methodName] instanceof Function)) return;
            //这里需要使用匿名函数，创建独立块级作用域，防止变量被污染
            (function() {
                var origionMethod = methods[methodName];
                //新方法格式，参数个数，函数体
                //方法体在客户端执行，所以需要将参数转换为js对象
                newMethods[methodName] = [origionMethod.length, function() {
                    try {
                        var args = _formatNativeToJS(Array.prototype.slice.call(arguments));
                        //让hook的js方法可以使用self，先保留上次使用的self，方便后面还原。
                        //这是一个tric的做法，全局变量本身不是一个好的方案，后面可以考虑优化掉。
                        var lastSelf = global.self;
                        global.self = args[0];
                        if(global.self) global.self.__realClsName = realClsName;
                        //将参数列表中索引0删除，因为客户端执行的时候参数索引0，为调用对象
                        args.splice(0,1);
                        //触发使用js重写的客户端方法,作用域一定要是原函数作用域，所以第一个参数是origionMethod
                        var ret = origionMethod.apply(origionMethod,args);
                        //hook的js方法调用完成后，需要将之前保留的self，在全局变量中还原
                        global.self = lastSelf;
                        return ret;
                    } catch(e) {
                        //客户端异常处理方法
                        _native_catch(e.message, e.stack);
                    }
                }];
            })();
        }
    }

    global.defineClass = function(declaration, properties, instMethods, clsMethods) {
        var newInstMethods = {};
        var newClsMethods = {};
        //遍历参数，若属性名参数省略
        if (!(properties instanceof Array)) {
            clsMethods = instMethods;
            instMethods = properties;
            properties = null;
        }
        //真实类名，去掉空格
        var realClsName = declaration.split(":")[0].trim();
        //1.属性，todo
        //2.格式化实例方法
        _formatDefineMethods(instMethods, newInstMethods, realClsName);
        //3.格式化类方法
        _formatDefineMethods(clsMethods, newClsMethods, realClsName);
        //4.客户端hook原始方法
        var ret = _native_defineClass(declaration, newInstMethods, newClsMethods);
        var className = ret["cls"];
        var superCls = ret["superCls"];
        //缓存已经注册的方法
        _nativeCls[className] = {
            instMethods:{},
            clsMethods:{},
        };
        //将父类的方法拷贝到子类中
        if (superCls.length && _nativeCls[superCls]) {
            for (var funcName in _nativeCls[superCls]['instMethods']) {
                _nativeCls[className]['instMethods'][funcName] = _nativeCls[superCls]['instMethods'][funcName]
            }
            for (var funcName in _nativeCls[superCls]['clsMethods']) {
                _nativeCls[className]['clsMethods'][funcName] = _nativeCls[superCls]['clsMethods'][funcName]
            }
        }
        //对重写的类、方法进行缓存
        _setupJSMethod(className, instMethods, 1, realClsName);
        _setupJSMethod(className, clsMethods, 0, realClsName);
        
        return require(className);
    }
})();