import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import {ReanimatedPlugin} from '@callstack/repack-plugin-reanimated';
import rspack from '@rspack/core';
import {getSharedDependencies} from 'super-app-showcase-sdk';
import {FederationManifestPlugin} from 'repack-atlas/plugin';
import {IntrospectionPlugin} from 'repack-atlas/introspection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Rspack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about Rspack configuration: https://rspack.dev/config/
 * Learn about Re.Pack configuration: https://re-pack.dev/docs/guides/configuration
 */

// Static mirror of getSharedDependencies({ eager: true }) with resolved
// versions (packages/sdk/lib/dependencies.json, pinned by the lockfile), in
// the array shape repack-atlas introspection expects.
const introspectionShared = [
  {
    name: 'react',
    version: '19.2.8',
    singleton: true,
    eager: true,
    requiredVersion: '19.2.8',
  },
  {
    name: 'react-native',
    version: '0.86.2',
    singleton: true,
    eager: true,
    requiredVersion: '0.86.2',
  },
  {
    name: '@bottom-tabs/react-navigation',
    version: '1.4.0',
    singleton: true,
    eager: true,
    requiredVersion: '1.4.0',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '3.1.1',
    singleton: true,
    eager: true,
    requiredVersion: '3.1.1',
  },
  {
    name: '@react-navigation/native',
    version: '7.3.14',
    singleton: true,
    eager: true,
    requiredVersion: '7.3.14',
  },
  {
    name: '@react-navigation/native-stack',
    version: '7.18.6',
    singleton: true,
    eager: true,
    requiredVersion: '7.18.6',
  },
  {
    name: 'react-native-bottom-tabs',
    version: '1.4.0',
    singleton: true,
    eager: true,
    requiredVersion: '1.4.0',
  },
  {
    name: 'react-native-paper',
    version: '5.15.3',
    singleton: true,
    eager: true,
    requiredVersion: '5.15.3',
  },
  {
    name: 'react-native-safe-area-context',
    version: '5.8.0',
    singleton: true,
    eager: true,
    requiredVersion: '5.8.0',
  },
  {
    name: 'react-native-screens',
    version: '4.26.2',
    singleton: true,
    eager: true,
    requiredVersion: '4.26.2',
  },
  {
    name: '@react-native-vector-icons/material-design-icons',
    version: '13.1.2',
    singleton: true,
    eager: true,
    requiredVersion: '13.1.2',
  },
  {
    name: 'super-app-showcase-sdk',
    version: '0.0.2',
    singleton: true,
    eager: true,
    requiredVersion: '0.0.2',
  },
  {
    name: 'react-native-edge-to-edge',
    version: '1.8.1',
    singleton: true,
    eager: true,
    requiredVersion: '1.8.1',
  },
  {
    name: 'react-native-reanimated',
    version: '4.5.3',
    singleton: true,
    eager: true,
    requiredVersion: '4.5.3',
  },
  {
    name: 'react-native-worklets',
    version: '0.11.3',
    singleton: true,
    eager: true,
    requiredVersion: '0.11.3',
  },
  {
    name: 'react-native-gesture-handler',
    version: '3.1.0',
    singleton: true,
    eager: true,
    requiredVersion: '3.1.0',
  },
  {
    name: '@shopify/react-native-skia',
    version: '2.10.1',
    singleton: true,
    eager: true,
    requiredVersion: '2.10.1',
  },
  {
    name: 'victory-native',
    version: '41.26.0',
    singleton: true,
    eager: true,
    requiredVersion: '41.26.0',
  },
  {
    name: '@gorhom/bottom-sheet',
    version: '5.2.14',
    singleton: true,
    eager: true,
    requiredVersion: '5.2.14',
  },
];

export default Repack.defineRspackConfig(({mode, platform}) => {
  const remotes = {
    auth: `auth@http://localhost:9003/${platform}/mf-manifest.json`,
    trading: `trading@http://localhost:9001/${platform}/mf-manifest.json`,
    wallet: `wallet@http://localhost:9002/${platform}/mf-manifest.json`,
  };
  const shared = getSharedDependencies({eager: true});
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
      // Expose host's node_modules as an absolute resolution root so that
      // shared-module fallbacks (Module Federation) requested from sibling
      // workspace packages — e.g. sdk's useFlashAnimation.ts importing the
      // host-owned react-native-reanimated — resolve correctly. Without this,
      // node resolution walks up from packages/sdk and never reaches
      // host/node_modules. Mirrors the modules config in the mini apps.
      modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
      // Vector Icons' common runtime declares get-image as a peer dependency.
      // Resolve it from the host explicitly so Rspack can traverse pnpm's
      // peer-dependent virtual-store layout. The Expo font probe is guarded by
      // a web-only branch and is not needed for bundled native fonts.
      alias: {
        '@react-native-vector-icons/get-image': path.resolve(
          __dirname,
          'node_modules/@react-native-vector-icons/get-image',
        ),
        'expo-font': false,
      },
    },
    output: {
      uniqueName: 'sas-host',
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
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      new Repack.RepackPlugin(),
      // react-native-reanimated is in host's dependencies, so Re.Pack's
      // validatePlugins expects a ReanimatedPlugin in the config. The worklet
      // transform is already handled by react-native-worklets/plugin in
      // babel.config.js (run via babel-swc-loader), so disable this plugin's
      // own transform rule to avoid double-transforming — it's only here to
      // satisfy the check and silence the spurious build warning.
      new ReanimatedPlugin({unstable_disableTransform: true}),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        dts: false,
        remotes,
        shared,
      }),
      new FederationManifestPlugin({
        name: 'host',
        manifest: true,
        writeToDisk: true,
        shared,
        remotes,
      }),
      new IntrospectionPlugin({
        name: 'host',
        role: 'host',
        exposes: [],
        remotes,
        shared: introspectionShared,
        port: 8081,
        native: {
          reactNativeVersion: '0.86.2',
          newArch: true,
          platforms: ['ios', 'android'],
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
});
