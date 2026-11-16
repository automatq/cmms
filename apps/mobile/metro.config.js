// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve the `@/*` alias (-> ./src/*) here instead of via Expo's tsconfig
// paths support (`experiments.tsconfigPaths` is off in app.json).
//
// tsconfig.json maps `react` to this workspace's @types/react 19 so tsc does
// not pick up the web workspace's hoisted React 18 types; Metro must not apply
// that type-only mapping, so tsconfig paths are kept out of the bundler.
const srcDir = path.resolve(__dirname, 'src');
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if (moduleName.startsWith('@/')) {
    return resolve(context, path.join(srcDir, moduleName.slice(2)), platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
