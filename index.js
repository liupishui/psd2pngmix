/*
* @Author: anchen
* @Date:   2018-02-07 19:46:55
* @Last Modified by:   liups
* @Last Modified time: 2018-02-08 09:31:33
*/
var fs = require('fs');
var path = require('path');
var PSD = require('psd');

var images = require("images");

var scanTree = function (Layer) {
    if (Layer.type == 'group' && Layer.visible) {
        for(let layerItem of Layer.children) {
            scanTree(layerItem);
        }
    }
    if (Layer.name.indexOf('.psd') != '-1' && Layer.visible) {
        replaceLayers.push(Layer);
        replaceLayersRecord.push(Layer);
    };
}
function psd2pngmix(psdfile){
    var replaceLayers = [];
    var replaceLayersRecord = [];
    var psd = PSD.fromFile(psdfile);
    if (psd.parse()) {
        var psdTreeExport = psd.tree().export();
        for(let layer of psdTreeExport.children) {
            scanTree(layer);
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
                    if (!resolveReady.some(function (val) { return val == layersCurrPath })) {
                        if (fs.existsSync(layersCurrPath)) {
                            var psdCurr = PSD.fromFile(layersCurr.name);
                            if(psdCurr.parse()){
                                psdCurr.tree()._children[0].saveAsPng(path.join(path.dirname(layersCurrPath), path.basename(layersCurrPath, '.psd') + '3.png'));
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
                console.log('translate done!');
            });
        });

        //scanTree(psdTree);

        //psdTree._children[0].saveAsPng('s.png',function(e){});
        // fs.writeFile('4.psd',psdTree.children()[0].layer.file.data,function(e){console.log(e)});
    };
}

module.exports = {psd2pngmix:psd2pngmix}


// images("input.png")                     //Load image from file
//                                         //加载图像文件
//     .size(400)                          //Geometric scaling the image to 400 pixels width
//                                         //等比缩放图像到400像素宽
//     .draw(images("logo.png"), 10, 10)   //Drawn logo at coordinates (10,10)
//                                         //在(10,10)处绘制Logo
//     .save("output.png", {               //Save the image to a file, with the quality of 50
//         quality: 50                    //保存图片到文件,图片质量为50
//     });

