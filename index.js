/*
* @Author: anchen
* @Date:   2018-02-07 19:46:55
* @Last Modified by:   liups
* @Last Modified time: 2018-02-09 14:11:08
*/
var fs = require('fs');
var path = require('path');
var PSD = require('psd');

var images = require("images");

var getFiles=function(filePath){
    var files=[];
    var getFilesLoop=function(filePath){
        var filesCurrent=fs.readdirSync(filePath);
        for(let i=0;i<filesCurrent.length;i++){
            var fileStatCurrent={};
            fileStatCurrent.path=path.join(filePath,filesCurrent[i]);
            try{
                fileStatCurrent.stats=fs.statSync(fileStatCurrent.path);
                files.push(fileStatCurrent);
                if(fileStatCurrent.stats.isDirectory()){
                    if(fileStatCurrent.path.indexOf('.asar')!=(fileStatCurrent.path.length-5)){//.asar做为文件处理
                        getFilesLoop(fileStatCurrent.path);
                    }
                }
            }catch(e){
                //console.log(e)
            }
        }
    }
    getFilesLoop(filePath);
    return files;
}
function scanTree(Layer,processing){
    console.log(Layer,processing);
    var scanTreeOrg=function(Layer,processing){
        if (Layer.type == 'group' && Layer.visible) {
            for(let layerItem of Layer.children) {
                scanTreeOrg(layerItem,processing);
            }
        }
        if(Layer.type == 'layer' && Layer.visible){
            processing(Layer);
        };
    }
    scanTreeOrg(Layer,processing);
}
function psd2pngmix(psdfile,cb){
    var psdfile=psdfile.path;
    if(psdfile.indexOf('.psd') == -1){
        cb()
        return;
    }
    // var scanTree = function (Layer) {
    //     if (Layer.type == 'group' && Layer.visible) {
    //         for(let layerItem of Layer.children) {
    //             scanTree(layerItem);
    //         }
    //     }
    //     if (Layer.name.indexOf('.psd') != '-1' && Layer.visible) {
    //         replaceLayers.push(Layer);
    //         replaceLayersRecord.push(Layer);
    //     };
    // }
    var replaceLayers = [];
    var replaceLayersRecord = [];
    console.log(psdfile);
    var psd = PSD.fromFile(psdfile);
    if (psd.parse()) {
        var psdTreeExport = psd.tree().export();
        for(let layer of psdTreeExport.children) {
            scanTree(layer,function(Layer){
                if(Layer.name.indexOf('.psd') != '-1'){
                    replaceLayers.push(Layer);
                    replaceLayersRecord.push(Layer);
                }
            })
        }
        var destPath = path.join(path.dirname(psdfile), path.basename(psdfile, '.psd') + '.png');
        psd.image.saveAsPng(destPath).then(function () {

            //递归替换对应图层
            var resolveReady = [];
            function replaceLayersToPng(layers, callback) {
                if (layers.length == 0) {
                    callback();
                } else {
                    var layersCurr = layers.splice(-1)[0];
                    var layersCurrPath = path.join(path.dirname(psdfile), layersCurr.name);
//                    console.log(layersCurrPath);
                    if (!resolveReady.some(function (val) { return val == layersCurrPath })) {
                        if (fs.existsSync(layersCurrPath)) {
                            var psdCurr = PSD.fromFile(layersCurrPath);
                            if(psdCurr.parse()){
                                //psdCurr.tree()._children[0].saveAsPng(path.join(path.dirname(layersCurrPath), path.basename(layersCurrPath, '.psd') + '3.png'));
                                psdCurr.image.saveAsPng(path.join(path.dirname(layersCurrPath), path.basename(layersCurrPath, '.psd') + '.png')).then(function () {
                                    replaceLayersToPng(layers, callback);
                                });
                            }else{
                                replaceLayersToPng(layers, callback);
                            }
                        } else {
                            replaceLayersToPng(layers, callback);
                        }
                    } else {
                        replaceLayersToPng(layers, callback);
                    }
                }
            }
            replaceLayersToPng(replaceLayers, function () {
                var imageCurr = images(destPath);
                for(let layer of replaceLayersRecord) {
                    var layersCurrPath = path.join(path.dirname(psdfile), layer.name);
                    var layersCurrPng = path.join(path.dirname(layersCurrPath), path.basename(layersCurrPath, '.psd') + '.png');
                    if (fs.existsSync(layersCurrPng)) {
                        var imageWater = images(layersCurrPng);
                        var x = layer.left < 0 ? 0 : layer.left;
                        var y = layer.top < 0 ? 0 : layer.top;
                        imageWater.resize(layer.width, layer.height);
                        imageCurr.draw(imageWater, x, y);
                    }
                };
                imageCurr.save(destPath);
                cb();
            });
        });

        //scanTree(psdTree);

        //psdTree._children[0].saveAsPng('s.png',function(e){});
        // fs.writeFile('4.psd',psdTree.children()[0].layer.file.data,function(e){console.log(e)});
    };
}
function psd2pngmixauto(path,cbauto){
    var allFile=[];
    if(fs.existsSync(path)){
        var pathInfo=fs.statSync(path);
        if(pathInfo.isDirectory()){
            allFile = getFiles(path);
        }else{
            allFile.push({path:path});
        }
        var parseAllFile=function(arr,cbauto){
            if(arr.length==0){
                cbauto();
            }else{
                var fileCurr=arr.splice(-1)[0];
                psd2pngmix(fileCurr,function(){parseAllFile(arr,cbauto)});
            }
        }
        parseAllFile(allFile,cbauto);
    }else{
        cbauto();
        console.log('没有该文件');
    }
};
module.exports = {psd2pngmix:psd2pngmix,psd2pngmixauto:psd2pngmixauto}


// images("input.png")                     //Load image from file
//                                         //加载图像文件
//     .size(400)                          //Geometric scaling the image to 400 pixels width
//                                         //等比缩放图像到400像素宽
//     .draw(images("logo.png"), 10, 10)   //Drawn logo at coordinates (10,10)
//                                         //在(10,10)处绘制Logo
//     .save("output.png", {               //Save the image to a file, with the quality of 50
//         quality: 50                    //保存图片到文件,图片质量为50
//     });

