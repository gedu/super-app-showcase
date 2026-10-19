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
    // Ignore benign "Critical dependency" warnings from reanimated/worklets'
    // dynamic require()s that Rspack can't statically extract. Neither path
    // runs in the app bundle under Re.Pack:
    //   - worklets bundleMode/metroOverrides: Metro-only runtime APIs
    //   - reanimated jestUtils: only executes when IS_JEST is true
    // Use the {module} form — a bare RegExp is matched against the warning
    // message, not the module path, so it would never match here.
    // Also ignore @gorhom/bottom-sheet's optional require('@shopify/flash-list')
    // (wrapped in try/catch) — flash-list isn't installed and the component
    // falls back to a regular list when it's absent.
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
      uniqueName: 'sas-wallet',
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
        name: 'wallet',
        filename: 'wallet.container.js.bundle',
        dts: false,
        exposes,
        remotes,
        shared,
      }),
      new FederationManifestPlugin({
        name: 'wallet',
        manifest: true,
        writeToDisk: true,
        shared,
        remotes,
        exposes,
        filename: 'wallet.container.js.bundle',
      }),
      new IntrospectionPlugin({
        name: 'wallet',
        role: 'remote',
        exposes: Object.keys(exposes),
        remotes,
        shared,
        port: 9002,
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
