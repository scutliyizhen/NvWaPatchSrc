//
//  NWJSEngine.swift
//  NWPatch
//
//  Created by 李义真 on 2019/7/26.
//

import Foundation;

typealias NWJSEngineJavaScriptRefreshBlock = (_ success:Bool, _ msg:String) -> Void;

class NWJSEngine: NSObject {
    private static let engine = NWJSEngine();
    private var replaceStr = ".__c(\"$1\")(";
    private var regex:NSRegularExpression = try! NSRegularExpression.init(pattern:"(?<!\\\\)\\.\\s*(\\w+)\\s*\\(", options: NSRegularExpression.Options.caseInsensitive);
    //MARK:生命周期
    override init() {
        super.init();
    }
    
    @objc public static var shared:NWJSEngine {
        return self.engine;
    }
    
    deinit {
      
    }
    
    private lazy var downloader:NWJSDownloader = {
        let downloader = NWJSDownloader();
        return downloader;
    }();
    
    private lazy var jsCoreBridge:NWJSCoreBridge = {
        let bridge = NWJSCoreBridge();
        return bridge;
    }();
    
    //MARK:公开方法
    @objc func startEngine() -> Void {
        self.jsCoreBridge.initContext();
        
    }
    
    @objc func refreshRuntimeLoadJavascript(callBack:@escaping NWJSEngineJavaScriptRefreshBlock) -> Void {
        self.downloadRuntimeJavascript(callBack: callBack);
    }
    
    @objc func refreshNuWaPatchTestDemoLoadJavascript(callBack:@escaping NWJSEngineJavaScriptRefreshBlock) -> Void {
        self.downloadNuWaPatchTestDemoJavascript(callBack: callBack);
    }
    
    //MARK:私有方法
    private func downloadRuntimeJavascript(callBack:@escaping NWJSEngineJavaScriptRefreshBlock) -> Void {
        //下载脚本
        if let URL = URL.init(string: "http://127.0.0.1:8000/index.js") {
            weak var weakSelf = self;
            self.downloader.downloadJSResource(requestURL: URL) { (success:Bool, script:String?, msg:String) in
                if let javascript = script {
                    weakSelf?.jsCoreBridge.evaluateScript(script: javascript);
                    callBack(true,"success");
                }
            }
        }
    }
    
    private func downloadNuWaPatchTestDemoJavascript(callBack:@escaping NWJSEngineJavaScriptRefreshBlock) -> Void {
        //下载脚本
        if let URL = URL.init(string: "http://127.0.0.1:8000/testDemo.js") {
            weak var weakSelf = self;
            self.downloader.downloadJSResource(requestURL: URL) { (success:Bool, script:String?, msg:String) in
                if let javascript = script {
                    let formatedScript = String.init(format: ";(function(){try{\n%@\n}catch(e){_native_catch(e.message, e.stack)}})();", self.regex.stringByReplacingMatches(in: javascript, options:.withTransparentBounds , range: NSRange.init(location: 0, length: javascript.count), withTemplate: self.replaceStr));
                    weakSelf?.jsCoreBridge.evaluateScript(script: formatedScript);
                    callBack(true,"success");
                }
            }
        }
    }
}
