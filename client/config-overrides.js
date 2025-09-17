// client/config-overrides.js (CORRECTED AND FINAL)

const webpack = require('webpack');

module.exports = function override(config) {
    // Add fallback for 'process/browser'
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "process/browser": require.resolve("process/browser")
    });
    config.resolve.fallback = fallback;

    // Add ProvidePlugin to make 'process' available globally in the browser
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser',
        })
    ]);

    // Add fallback for 'buffer' as well, as it is often needed too
    Object.assign(fallback, {
        "buffer": require.resolve("buffer")
    });
    config.plugins.push(
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        })
    );
    
    return config;
}