//webpack.config.js
const path = require('path');
module.exports = {
    //js的入口文件，支持多入口
    entry:{
        main: path.resolve(__dirname,'../src/index.js'),
    },
    output: {
        //js打包压缩后的出口文件，npm多入口时对应的配置应做相对变化
        path: path.resolve(__dirname, '../dist'),
    },
    module: {
        rules: [] // 配置loder使用的规则、作用范围、控制输出的名称、位置等；主要作用是编译，解析文件； 暂时不使用loader
    }
};