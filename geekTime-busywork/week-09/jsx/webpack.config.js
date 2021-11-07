const path = require('path');

module.exports = {
    entry: "./animation-demo.js",
    entry: "./main.js",
    module: {
        rules: [
            {
                test:/\.js$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                        plugins: [["@babel/plugin-transform-react-jsx", {pragma:"createElement"}]]
                    }
                }
            }
        ]
    },
    devServer: {
        static: {
            // directory: path.join(__dirname, 'dist'),
            directory: path.join(__dirname),
        },
        compress: true,
        port: 9000,
    },
    mode: "development"   // 开发者模式

};