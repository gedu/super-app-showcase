import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import {getSharedDependencies} from 'super-app-showcase-sdk';
import {FederationManifestPlugin} from 'repack-atlas/plugin';
import {IntrospectionPlugin} from 'repack-atlas/introspection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static mirror of getSharedDependencies({ eager: false }) with resolved
// versions (packages/sdk/lib/dependencies.json, pinned by the lockfile), in
// the array shape repack-atlas introspection expects.
const introspectionShared = [
  {
    name: 'react',
    version: '19.2.8',
    singleton: true,
    eager: false,
    requiredVersion: '19.2.8',
  },
  {
    name: 'react-native',
    version: '0.86.2',
    singleton: true,
    eager: false,
    requiredVersion: '0.86.2',
  },
  {
    name: '@bottom-tabs/react-navigation',
    version: '1.4.0',
    singleton: true,
    eager: false,
    requiredVersion: '1.4.0',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '3.1.1',
    singleton: true,
    eager: false,
    requiredVersion: '3.1.1',
  },
  {
    name: '@react-navigation/native',
    version: '7.3.14',
    singleton: true,
    eager: false,
    requiredVersion: '7.3.14',
  },
  {
    name: '@react-navigation/native-stack',
    version: '7.18.6',
    singleton: true,
    eager: false,
    requiredVersion: '7.18.6',
  },
  {
    name: 'react-native-bottom-tabs',
    version: '1.4.0',
    singleton: true,
    eager: false,
    requiredVersion: '1.4.0',
  },
  {
    name: 'react-native-paper',
    version: '5.15.3',
    singleton: true,
    eager: false,
    requiredVersion: '5.15.3',
  },
  {
    name: 'react-native-safe-area-context',
    version: '5.8.0',
    singleton: true,
    eager: false,
    requiredVersion: '5.8.0',
  },
  {
    name: 'react-native-screens',
    version: '4.26.2',
    singleton: true,
    eager: false,
    requiredVersion: '4.26.2',
  },
  {
    name: '@react-native-vector-icons/material-design-icons',
    version: '13.1.2',
    singleton: true,
    eager: false,
    requiredVersion: '13.1.2',
  },
  {
    name: 'super-app-showcase-sdk',
    version: '0.0.2',
    singleton: true,
    eager: false,
    requiredVersion: '0.0.2',
  },
  {
    name: 'react-native-edge-to-edge',
    version: '1.8.1',
    singleton: true,
    eager: false,
    requiredVersion: '1.8.1',
  },
  {
    name: 'react-native-reanimated',
    version: '4.5.3',
    singleton: true,
    eager: false,
    requiredVersion: '4.5.3',
  },
  {
    name: 'react-native-worklets',
    version: '0.11.3',
    singleton: true,
    eager: false,
    requiredVersion: '0.11.3',
  },
  {
    name: 'react-native-gesture-handler',
    version: '3.1.0',
    singleton: true,
    eager: false,
    requiredVersion: '3.1.0',
  },
  {
    name: '@shopify/react-native-skia',
    version: '2.10.1',
    singleton: true,
    eager: false,
    requiredVersion: '2.10.1',
  },
  {
    name: 'victory-native',
    version: '41.26.0',
    singleton: true,
    eager: false,
    requiredVersion: '41.26.0',
  },
  {
    name: '@gorhom/bottom-sheet',
    version: '5.2.14',
    singleton: true,
    eager: false,
    requiredVersion: '5.2.14',
  },
];

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
        shared: introspectionShared,
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
