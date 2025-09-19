/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Screens } from '../constants/Screens';
import { useActiveServerHandler } from '../hooks/useActiveServerHandler';
import { useStores } from '../hooks/useStores';
import AddServerScreen from '../screens/AddServerScreen';

import TabNavigator from './TabNavigator';

export type AppStackParams = {
	[Screens.MainScreen]: {
		screen?: string;
		params?: {
			screen?: string;
			params?: {
				activeServer: number;
			}
		}
	};
	[Screens.AddServerScreen]: undefined;
};

const AppStack = createNativeStackNavigator<AppStackParams>();

const AppNavigator = () => {
	const { rootStore, serverStore } = useStores();
	const { t } = useTranslation();
	const hasSavedServer = serverStore.servers.length > 0;

	// Handle active server + navigation for server changes
	useActiveServerHandler();

	// Ensure the splash screen is hidden when loading is finished
	SplashScreen.hideAsync().catch(console.debug);

	return (
		<AppStack.Navigator
			initialRouteName={hasSavedServer ? Screens.MainScreen : Screens.AddServerScreen}
			screenOptions={{
				autoHideHomeIndicator: rootStore.isFullscreen,
				headerShown: false
			}}
		>
			<AppStack.Screen
				name={Screens.MainScreen}
				component={TabNavigator}
				options={({ route }) => {
					const routeName =
						// Get the currently active route name in the tab navigator
						getFocusedRouteNameFromRoute(route) ||
						// If state doesn't exist, we need to default to `screen` param if available, or the initial screen
						// In our case, it's "Main" as that's the first screen inside the navigator
						route.params?.screen || Screens.MainScreen;
					return {
						title: t(`headings.${routeName.toLowerCase()}`)
					};
				}}
			/>
			<AppStack.Screen
				name={Screens.AddServerScreen}
				component={AddServerScreen}
				options={{
					headerShown: hasSavedServer,
					title: t('headings.addServer')
				}}
			/>
		</AppStack.Navigator>
	);
};

AppNavigator.displayName = 'AppNavigator';

export default AppNavigator;
