import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import {FederationManifestPlugin} from '@callstack/repack-atlas/plugin';
import {IntrospectionPlugin} from '@callstack/repack-atlas/introspection';
import rspack from '@rspack/core';
import {getSharedDependencies} from 'super-app-showcase-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default Repack.defineRspackConfig(({mode, platform}) => {
  const exposes = {
    './App': './src/navigation/MainNavigator',
  };
  const remotes = {
    auth: `auth@http://localhost:9003/${platform}/mf-manifest.json`,
  };
  const shared = getSharedDependencies({eager: false});
  return {
    mode,
    context: __dirname,
    // Silence benign "Critical dependency" warnings from dynamic require()s
    // that don't run in the app bundle (worklets/reanimated Metro-only and
    // jest-only paths, and bottom-sheet's optional flash-list fallback).
    ignoreWarnings: [
      {
        module:
          /react-native-worklets[\\/]src[\\/]bundleMode[\\/]metroOverrides/,
      },
      {module: /react-native-reanimated[\\/]src[\\/]jestUtils/},
      {module: /@gorhom[\\/]bottom-sheet[\\/].*BottomSheetFlashList/},
    ],
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({enablePackageExports: true}),
      modules: [
        path.resolve(__dirname, '../host/node_modules'),
        'node_modules',
      ],
    },
    output: {
      uniqueName: 'sas-trading',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules({inline: true}),
      ],
    },
    plugins: [
      new Repack.RepackPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'trading',
        filename: 'trading.container.js.bundle',
        dts: false,
        exposes,
        remotes,
        shared,
      }),
      new FederationManifestPlugin({
        name: 'trading',
        manifest: true,
        writeToDisk: true,
        shared,
        remotes,
        exposes,
        filename: 'trading.container.js.bundle',
      }),
      new IntrospectionPlugin({
        name: 'trading',
        role: 'remote',
        exposes: Object.keys(exposes),
        remotes,
        shared,
        port: 9001,
        native: {
          reactNativeVersion: '0.86.2',
          newArch: true,
          platforms: ['ios', 'android'],
        },
      }),
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
});
