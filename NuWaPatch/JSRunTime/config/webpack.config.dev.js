//webpack.config.dev.js
const path = require('path');
const merge=require('webpack-merge');//这里引入merge
const common=require('./webpack.config.common.js');//这里引入公共代码
module.exports = merge(common,{
    mode:'development',
    output: {
        // //js打包压缩后的出口文件，npm多入口时对应的配置应做相对变化
        filename: 'nuwa-runtime-dev.js'
    },
    devtool: 'inline-source-map',
    //webpack-dev-server配置（仅开发环境需要）
    target: () => undefined,
    devServer: {
        //编译打包文件的位置
        contentBase: [path.join(__dirname, '../src'), path.join(__dirname, '../dist'),path.join(__dirname, '../test')],
        port: 8000,//端口号
        // open:true,
        proxy: {},//代理服务列表
        compress:true,
    },
});   