/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// polyfill whatwg URL globals
import 'react-native-url-polyfill/auto';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext, ThemeProvider } from 'react-native-elements';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ThemeSwitcher from './components/ThemeSwitcher';
import { useDownloadHandler } from './hooks/useDownloadHandler';
import { useIsHydrated } from './hooks/useHydrated';
import { useStores } from './hooks/useStores';
import { fromStorageObject } from './models/DownloadModel';
import ServerModel from './models/ServerModel';
import RootNavigator from './navigation/RootNavigator';
import StaticScriptLoader from './utils/StaticScriptLoader';

// Import i18n configuration
import './i18n';

// Storage key for the migration status
const ZUSTAND_MIGRATED = '__zustand_migrated__';
// Track migration state with a version in case we encounter errors with the migration
const ZUSTAND_MIGRATION_VERSION = 2;

const App = ({ skipLoadingScreen }) => {
	const [ isSplashReady, setIsSplashReady ] = useState(false);
	// NOTE: After the mobx migration is removed, we can just use isHydrated
	const [ isStoresReady, setIsStoresReady ] = useState(false);
	const { rootStore, downloadStore, settingStore, serverStore } = useStores();
	const { theme } = useContext(ThemeContext);
	const isHydrated = useIsHydrated();
	const colorScheme = useColorScheme();

	// Initialize download hook
	useDownloadHandler();

	// Store the system color scheme for automatic theme switching
	useEffect(() => {
		// Don't set state while hydrating
		if (!isHydrated) return;

		console.debug('system theme changed:', colorScheme);
		settingStore.set({
			systemThemeId: colorScheme
		});
	}, [ colorScheme, isHydrated ]);

	SplashScreen.preventAutoHideAsync();

	const migrateStores = async () => {
		// TODO: In release n+2 from this point, remove this conversion code.
		const zustandMigratedVersion = parseInt(await AsyncStorage.getItem(ZUSTAND_MIGRATED) || '0', 10);
		const mobxStoreValue = await AsyncStorage.getItem('__mobx_sync__'); // Store will be null if it's not set

		console.info('zustand migration version', zustandMigratedVersion);

		if (zustandMigratedVersion < ZUSTAND_MIGRATION_VERSION && mobxStoreValue !== null) {
			console.info('Migrating mobx store to zustand');
			const mobx_store = JSON.parse(mobxStoreValue);

			// Root Store
			if (mobx_store.deviceId) {
				rootStore.set({ deviceId: mobx_store.deviceId });
			}

			/**
			 * Server store & download store need some special treatment because they
			 * are not simple key-value pair stores. Each contains one key which is a
			 * list of Model objects that represent the contents of their respective
			 * stores.
			 *
			 * zustand requires a custom storage engine for these for proper
			 * serialization and deserialization (written in each storage's module),
			 * but this code is needed to get them over the hump from mobx to zustand.
			 */
			// Download Store
			const mobxDownloads = mobx_store.downloadStore.downloads;
			const migratedDownloads = new Map();
			if (Object.keys(mobxDownloads).length > 0) {
				for (const [ key, value ] of Object.entries(mobxDownloads)) {
					migratedDownloads.set(key, fromStorageObject(value));
				}
			}
			downloadStore.set({ downloads: migratedDownloads });

			// Server Store
			const mobxServers = mobx_store.serverStore.servers;
			const migratedServers = [];
			if (Object.keys(mobxServers).length > 0) {
				for (const item of mobxServers) {
					migratedServers.push(new ServerModel(item.id, new URL(item.url), item.info));
				}
			}
			serverStore.set({ servers: migratedServers });

			// Setting Store
			for (const key of Object.keys(mobx_store.settingStore)) {
				console.info('SettingStore', key);
				settingStore.set({ [key]: mobx_store.settingStore[key] });
			}

			// TODO: Remove mobx sync item from async storage in a future release
			// AsyncStorage.removeItem('__mobx_sync__');

			// Migration completed; store the migration version
			await AsyncStorage.setItem(ZUSTAND_MIGRATED, `${ZUSTAND_MIGRATION_VERSION}`);
		}

		setIsStoresReady(true);
	};

	const loadImages = () => {
		const images = [
			require('@jellyfin/ux-ios/splash.png'),
			require('@jellyfin/ux-ios/logo-dark.png')
		];
		return images.map(image => Asset.fromModule(image).downloadAsync());
	};

	const loadResources = async () => {
		try {
			await Promise.all([
				Font.loadAsync({
					// This is the font that we are using for our tab bar
					...Ionicons.font
				}),
				...loadImages(),
				StaticScriptLoader.load()
			]);
		} catch (err) {
			console.warn('[App] Failed loading resources', err);
		}

		setIsSplashReady(true);
	};

	useEffect(() => {
		if (isHydrated) {
			// Migrate mobx data stores
			migrateStores();

			// Load app resources
			loadResources();
		}
	}, [ isHydrated ]);

	useEffect(() => {
		console.info('rotation lock setting changed!', settingStore.isRotationLockEnabled);
		if (settingStore.isRotationLockEnabled) {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
		} else {
			ScreenOrientation.unlockAsync();
		}
	}, [ settingStore.isRotationLockEnabled ]);

	const updateScreenOrientation = async () => {
		if (settingStore.isRotationLockEnabled) {
			if (rootStore.isFullscreen) {
				// Lock to landscape orientation
				// For some reason video apps on iPhone use LANDSCAPE_RIGHT ¯\_(ツ)_/¯
				await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
				// Allow either landscape orientation after forcing initial rotation
				ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
			} else {
				// Restore portrait orientation lock
				ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
			}
		}
	};

	useEffect(() => {
		// Update the screen orientation
		updateScreenOrientation();
	}, [ rootStore.isFullscreen ]);

	if (!(isSplashReady && isStoresReady) && !skipLoadingScreen) {
		return null;
	}

	return (
		<SafeAreaProvider>
			<ThemeProvider theme={settingStore.getTheme().Elements}>
				<ThemeSwitcher />
				<StatusBar
					style='light'
					backgroundColor={theme.colors.grey0}
					hidden={rootStore.isFullscreen}
				/>
				<NavigationContainer theme={settingStore.getTheme().Navigation}>
					<RootNavigator />
				</NavigationContainer>
			</ThemeProvider>
		</SafeAreaProvider>
	);
};

App.propTypes = {
	skipLoadingScreen: PropTypes.bool
};

export default App;
