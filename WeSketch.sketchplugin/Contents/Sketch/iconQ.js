@import "common.js";

var usualKey = "com.sketchplugins.wechat.iconusual";
var loginKey = "com.sketchplugins.wechat.iconLogin";
var loginNameKey = "com.sketchplugins.wechat.iconLoginName";
var sig = NSUserDefaults.standardUserDefaults().objectForKey(loginKey);


function iconLogin(data){
    var r = post(['/users/login','username='+data.username + '&password='+data.password]);
    if(r.status == 200){
        NSUserDefaults.standardUserDefaults().setObject_forKey(data.username,loginNameKey);
    }
    return r;
}

function getSvg(){
    return post(['/users/getFiles']);
}

function getLogin(){
    return post(['/users/login']);
}

function queryProject(){
   var r = post(['/users/queryProject']);
   return r;
}

function queryProjectIcon(projectid){
   var r = post(['/users/queryIconByProId','projectid='+projectid]);
   return r;
}

function queryTypeIcon(categoryid){
   var r = post(['/users/queryIconByCateId','categoryid='+categoryid]);
   return r;
}

var onRun = function(context){
    var svgtitle = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';

    var pluginSketch = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("library").path();

    var baseSvg = getSvg().data;

    var isLogin;
    if(!NSUserDefaults.standardUserDefaults().objectForKey(loginKey) || NSUserDefaults.standardUserDefaults().objectForKey(loginKey).length()  != 32){
        isLogin = false;
    }else{
        isLogin = getLogin();
    }
     

    var initData = {data:baseSvg,isLogin:isLogin};
    if(isLogin == false || isLogin.status != 200){
        initData.isLogin = false;
    }else{
        var username = NSUserDefaults.standardUserDefaults().objectForKey(loginNameKey);
        var b = '';
        b += username;
        initData.nametest = b;
        var project = queryProject().list;
        initData.project = project;
        initData.isLogin = true;
    }

	SMPanel({
        url: pluginSketch + "/panel/icon.html?12",
        width: 562,
        height: 548,
        data: initData,
        hiddenClose: false,
        floatWindow: true,
        identifier: "icon",
        callback: function( data ){
            if(data.type == 'link'){
                openUrlInBrowser(data.link);
                return;
            }else if(data.type == 'public' || data.type == 'private'){
                var page = context.document.currentPage();
                data.name = data.name.replace('.svg','');
                page.setCurrentArtboard(null);
                var contentDrawView = context.document.currentView();
                var midX = Math.round((contentDrawView.frame().size.width/2 - contentDrawView.horizontalRuler().baseLine())/contentDrawView.zoomValue());
                var midY = Math.round((contentDrawView.frame().size.height/2 - contentDrawView.verticalRuler().baseLine())/contentDrawView.zoomValue());
                var x = midX - data.width/2;
                var y = midY - data.height/2;
                var logo = decodeURIComponent(data.content);
                logo = svgtitle + logo.replace('xmlns="http://www.w3.org/2000/svg"','version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
                logo = NSString.stringWithString(logo);
                logo = [logo dataUsingEncoding: NSUTF8StringEncoding];
                var svgImporter = MSSVGImporter.svgImporter();
                svgImporter.prepareToImportFromData(logo);
                var importedSVGLayer = svgImporter.importAsLayer();
                var svgFrame = importedSVGLayer.frame();
                importedSVGLayer.name = data.name;
                var oldWidth = svgFrame.width();
                var oldHeight = svgFrame.height();
                [svgFrame setWidth:data.width];
                svgFrame.setHeight(data.width*oldHeight/oldWidth);
                if(data.type == 'public'){
                    var children = importedSVGLayer.children();
                    var colorToReplace = hexToRgb(data.color);
                    for(var j = 0;j<children.length;j++){
                        if(children[j].className() == 'MSShapeGroup'){
                            var fill = children[j].style().fills().firstObject();
                            fill.color = MSColor.colorWithRed_green_blue_alpha(colorToReplace.r / 255, colorToReplace.g / 255, colorToReplace.b / 255, 1.0);
                        }
                    }
                }
                [svgFrame setX:x];
                [svgFrame setY:y];
                page.addLayers([importedSVGLayer]);
                if(context.selection>0){
                    for(var i = 0;i<context.selection.length;i++){
                        context.selection[i].select_byExpandingSelection(false,false);
                    }
                }
                importedSVGLayer.select_byExpandingSelection(true, true);
                context.document.showMessage('图标已导入到画板中央');
            }else if(data.type == 'loginout'){
                NSUserDefaults.standardUserDefaults().setObject_forKey('',loginNameKey);
                NSUserDefaults.standardUserDefaults().setObject_forKey('',loginKey);
            }
        },loginCallback:function( windowObject ){
            var data = JSON.parse(decodeURI(windowObject.valueForKey("SMData")));
            var reuslt = iconLogin(data);

            if(reuslt.status == 200){
                NSUserDefaults.standardUserDefaults().setObject_forKey(reuslt.sig,loginKey);
                var username = NSUserDefaults.standardUserDefaults().objectForKey(loginNameKey);
                var b = '';
                b += username;
                reuslt.nametest = b;
                project = queryProject().list;
                reuslt.project = project;
            }
            windowObject.evaluateWebScript("sLogin("+JSON.stringify(reuslt)+")");
        },pushdataCallback:function(data ,windowObject ){
            var reuslt = {};
            if(data.type == 'type'){
                reuslt = queryTypeIcon(data.id);
            }else{
                reuslt = queryProjectIcon(data.id);
            }
            windowObject.evaluateWebScript("pushdata("+JSON.stringify(reuslt)+")");
            windowObject.evaluateWebScript("window.location.hash = '';");
            // windowObject.evaluateWebScript("pushdata("+JSON.stringify(reuslt)+")");

        }
    });
}