//webpack.config.prod.js
const merge=require('webpack-merge');
const webpack=require('webpack');
const common=require('./webpack.config.common.js');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = merge(common,{
    mode: 'production',
    output: {
        // //js打包压缩后的出口文件，npm多入口时对应的配置应做相对变化
        // path: path.resolve(__dirname, '../dist'),
        filename: 'nuwa-runtime-prod.js'
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ['dist']
        })
    ]
});