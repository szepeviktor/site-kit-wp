/**
 * Settings datastore functions tests.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * External dependencies
 */
import fetchMock from 'fetch-mock-jest';

/**
 * WordPress dependencies
 */
import { createRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import {
	muteConsole,
	subscribeUntil,
	unsubscribeFromAll,
} from '../../../../tests/js/utils';
import { createSettingsStore } from './create-settings-store';

const STORE_ARGS = [ 'core', 'site', 'settings' ];

describe( 'createSettingsStore store', () => {
	let dispatch;
	let registry;
	let select;
	let storeDefinition;
	let store;

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createRegistry();

		storeDefinition = createSettingsStore( ...STORE_ARGS, {
			settingSlugs: [ 'isSkyBlue' ],
			registry,
		} );
		registry.registerStore( storeDefinition.STORE_NAME, storeDefinition );
		dispatch = registry.dispatch( storeDefinition.STORE_NAME );
		store = registry.stores[ storeDefinition.STORE_NAME ].store;
		select = registry.select( storeDefinition.STORE_NAME );
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	afterEach( () => {
		fetchMock.restore();
		fetchMock.mockClear();
		unsubscribeFromAll( registry );
	} );

	describe( 'name', () => {
		it( 'returns the correct default store name', () => {
			expect( storeDefinition.STORE_NAME ).toEqual( `${ STORE_ARGS[ 0 ] }/${ STORE_ARGS[ 1 ] }` );
		} );
	} );

	describe( 'actions', () => {
		describe( 'setSettings', () => {
			it( 'requires the values param', () => {
				expect( () => {
					dispatch.setSettings();
				} ).toThrow( 'values is required.' );
			} );

			it( 'updates the respective settings', () => {
				const values1 = { setting1: 'old', setting2: 'old' };
				const values2 = { setting2: 'new' };

				dispatch.setSettings( values1 );
				expect( store.getState().settings ).toMatchObject( values1 );

				dispatch.setSettings( values2 );
				expect( store.getState().settings ).toMatchObject( { ...values1, ...values2 } );
			} );
		} );

		describe( 'fetchSettings', () => {
			it( 'does not require any params', () => {
				expect( () => {
					fetchMock.get( /^\/google-site-kit\/v1\/core\/site\/data\/settings/, { body: {}, status: 200 } );
					dispatch.fetchSettings();
				} ).not.toThrow();
			} );
		} );

		describe( 'receiveSettings', () => {
			it( 'requires the values param', () => {
				expect( () => {
					muteConsole( 'error' );
					dispatch.receiveSettings();
				} ).toThrow( 'values is required.' );
			} );

			it( 'receives and sets values', () => {
				const serverValues = { setting1: 'serverside', setting2: 'serverside' };
				const clientValues = { setting1: 'clientside' };

				dispatch.setSettings( clientValues );
				dispatch.receiveSettings( serverValues );

				// Client values take precedence if they were already modified before receiving from the server.
				expect( store.getState().settings ).toMatchObject( { ...serverValues, ...clientValues } );
			} );
		} );

		describe( 'saveSettings', () => {
			it( 'does not require any params', () => {
				expect( async () => {
					fetchMock.once(
						/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
						{ body: { setting1: 'serverside' }, status: 200 }
					);
					muteConsole( 'error' );
					await dispatch.saveSettings();
				} ).not.toThrow();
			} );

			it( 'updates settings from server', async () => {
				const response = { isSkyBlue: 'yes' };
				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{ body: response, status: 200 }
				);

				// The server is the authority. So because this won't be part of the response
				// (see above), it will be disregarded.
				dispatch.setSettings( { isSkyBlue: 'no' } );

				dispatch.saveSettings();

				await subscribeUntil( registry, () => select.isDoingSaveSettings() === false );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{
						body: { data: { isSkyBlue: 'no' } },
					}
				);

				expect( store.getState().settings ).toMatchObject( response );
			} );
		} );

		describe( 'fetchSaveSettings', () => {
			it( 'requires the values param', () => {
				const consoleErrorSpy = jest.spyOn( global.console, 'error' );

				dispatch.fetchSaveSettings();
				expect( consoleErrorSpy ).toHaveBeenCalledWith( 'values is required.' );

				consoleErrorSpy.mockClear();
			} );

			it( 'sets isDoingSaveSettings', () => {
				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{ body: { setting1: true }, status: 200 }
				);

				dispatch.fetchSaveSettings( {} );
				expect( select.isDoingSaveSettings() ).toEqual( true );
			} );
		} );

		describe( 'receiveSaveSettings', () => {
			it( 'requires the values param', () => {
				expect( () => {
					dispatch.receiveSaveSettings();
				} ).toThrow( 'values is required.' );
			} );

			it( 'receives and sets values', () => {
				const serverValues = { setting1: 'serverside', setting2: 'serverside' };
				const clientValues = { setting1: 'clientside', setting3: 'clientside' };

				dispatch.setSettings( clientValues );
				dispatch.receiveSaveSettings( serverValues );

				// Client values are ignored here, server values replace them.
				expect( store.getState().settings ).toMatchObject( { ...serverValues } );
			} );
		} );

		// Tests for "pseudo-action" setSetting, available via setting-specific "set{SettingSlug}".
		describe( 'setSetting', () => {
			it( 'has the correct action name', () => {
				expect( Object.keys( storeDefinition.actions ) ).toEqual(
					// "isSkyBlue" should turn into "setIsSkyBlue".
					expect.arrayContaining( [ 'setIsSkyBlue' ] )
				);
			} );

			it( 'returns the correct action type', () => {
				const action = storeDefinition.actions.setIsSkyBlue( true );
				// "isSkyBlue" should turn into "SET_IS_SKY_BLUE".
				expect( action.type ).toEqual( 'SET_IS_SKY_BLUE' );
			} );

			it( 'requires the value param', () => {
				expect( () => {
					dispatch.setIsSkyBlue();
				} ).toThrow( 'value is required.' );
			} );

			it( 'supports setting falsy values', () => {
				expect( () => {
					dispatch.setIsSkyBlue( false );
				} ).not.toThrow( 'value is required.' );
			} );

			it( 'updates the respective setting', () => {
				const value = 'new';

				dispatch.setIsSkyBlue( value );
				expect( store.getState().settings ).toMatchObject( { isSkyBlue: value } );
			} );
		} );

		describe( 'rollbackSettings', () => {
			it( 'returns settings back to their saved values', () => {
				const savedSettings = { isSkyBlue: 'yes' };
				dispatch.receiveSaveSettings( savedSettings );

				expect( select.getIsSkyBlue() ).toBe( 'yes' );

				dispatch.setIsSkyBlue( 'maybe' );
				expect( select.getIsSkyBlue() ).toBe( 'maybe' );

				dispatch.rollbackSettings();

				expect( select.getIsSkyBlue() ).toBe( 'yes' );
			} );
		} );
	} );

	describe( 'selectors', () => {
		describe( 'getSettings', () => {
			it( 'uses a resolver to make a network request', async () => {
				const response = { setting1: 'value' };
				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{ body: response, status: 200 }
				);

				const initialSettings = select.getSettings();
				// Settings will be their initial value while being fetched.
				expect( initialSettings ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						select.getSettings() !== undefined
					),
				);

				const settings = select.getSettings();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( settings ).toEqual( response );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( select.getSettings() ).toEqual( settings );
			} );

			it( 'does not make a network request if settings are already set', async () => {
				const value = 'serverside';

				dispatch.receiveSettings( { isSkyBlue: value } );

				expect( select.getIsSkyBlue() ).toEqual( value );

				await subscribeUntil( registry, () => select.hasFinishedResolution( 'getSettings' ) );

				expect( fetchMock ).toHaveFetchedTimes( 0 );
			} );

			it( 'returns client settings even if server settings have not loaded', () => {
				const values = { setting1: 'value' };
				dispatch.setSettings( values );

				// If settings are set on the client, they must be available even
				// if settings have not been loaded from the server yet.
				muteConsole( 'error' ); // Ignore the API fetch failure here.
				expect( select.getSettings() ).toEqual( values );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{ body: response, status: 500 }
				);

				muteConsole( 'error' );
				select.getSettings();
				await subscribeUntil( registry,
					// TODO: We may want a selector for this, but for now this is fine
					// because it's internal-only.
					() => store.getState().isFetchingSettings === false,
				);

				const settings = select.getSettings();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( settings ).toEqual( undefined );
			} );
		} );

		describe( 'haveSettingsChanged', () => {
			it( 'informs whether client-side settings differ from server-side ones', async () => {
				// Initially false.
				expect( select.haveSettingsChanged() ).toEqual( false );

				const serverValues = { setting1: 'serverside' };
				const clientValues = { setting1: 'clientside' };

				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{ body: serverValues, status: 200 }
				);

				select.getSettings();
				await subscribeUntil( registry,
					() => (
						select.getSettings() !== undefined
					),
				);

				// Still false after fetching settings from server.
				expect( select.haveSettingsChanged() ).toEqual( false );

				// True after updating settings on client.
				dispatch.setSettings( clientValues );
				expect( select.haveSettingsChanged() ).toEqual( true );

				// False after updating settings back to original server value on client.
				dispatch.setSettings( serverValues );
				expect( select.haveSettingsChanged() ).toEqual( false );
			} );
		} );

		// Tests for "pseudo-selector" getSetting, available via setting-specific "get{SettingSlug}".
		describe( 'getSetting', () => {
			it( 'has the correct selector name', () => {
				expect( Object.keys( storeDefinition.selectors ) ).toEqual(
					// "isSkyBlue" should turn into "getIsSkyBlue".
					expect.arrayContaining( [ 'getIsSkyBlue' ] )
				);
			} );

			it( 'uses a resolver to make a network request', async () => {
				const value = 'serverside';
				fetchMock.once(
					/^\/google-site-kit\/v1\/core\/site\/data\/settings/,
					{
						body: {
							otherSetting: 'other-value',
							isSkyBlue: value,
						},
						status: 200,
					}
				);

				// Setting will have its initial value while being fetched.
				expect( select.getIsSkyBlue() ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						select.getSettings() !== undefined
					),
				);

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( select.getIsSkyBlue() ).toEqual( value );
				expect( fetchMock ).toHaveFetchedTimes( 1 );
			} );
		} );
	} );

	describe( 'per-setting selectors', () => {
		it( 'get{SettingSlug}', () => {
			dispatch.setSettings( { isSkyBlue: 'yes' } );

			expect( select.getIsSkyBlue() ).toBe( 'yes' );
		} );

		it( 'set{SettingSlug}', () => {
			dispatch.setSettings( { isSkyBlue: 'yes' } );

			dispatch.setIsSkyBlue( 'not right now' );

			expect( select.getIsSkyBlue() ).toBe( 'not right now' );
		} );
	} );

	describe( 'controls', () => {
		describe( 'FETCH_SETTINGS', () => {
			it( 'requests from the correct API endpoint', async () => {
				const [ type, identifier, datapoint ] = STORE_ARGS;
				const response = { type, identifier, datapoint };

				fetchMock.once(
					( url ) => (
						url.startsWith( `/google-site-kit/v1/${ type }/${ identifier }/data/${ datapoint }` )
					),
					{ body: response, status: 200 }
				);
				fetchMock.once(
					( url ) => (
						! url.startsWith( `/google-site-kit/v1/${ type }/${ identifier }/data/${ datapoint }` )
					),
					{
						body: {
							code: 'incorrect_api_endpoint',
							message: 'Incorrect API endpoint',
							data: { status: 400 },
						},
						init: { status: 400 },
					}
				);

				const result = await storeDefinition.controls.FETCH_SETTINGS();
				expect( result ).toEqual( response );
				// Ensure `console.error()` wasn't called, which will happen if the API
				// request fails.
				expect( global.console.error ).not.toHaveBeenCalled();
			} );
		} );

		describe( 'FETCH_SAVE_SETTINGS', () => {
			it( 'requests from the correct API endpoint', async () => {
				const [ type, identifier, datapoint ] = STORE_ARGS;
				const response = { type, identifier, datapoint };

				fetchMock.once(
					( url ) => (
						url.startsWith( `/google-site-kit/v1/${ type }/${ identifier }/data/${ datapoint }` )
					),
					{ body: response, status: 200 }
				);
				fetchMock.once(
					( url ) => (
						! url.startsWith( `/google-site-kit/v1/${ type }/${ identifier }/data/${ datapoint }` )
					),
					{
						body: {
							code: 'incorrect_api_endpoint',
							message: 'Incorrect API endpoint',
							data: { status: 400 },
						},
						init: { status: 400 },
					}
				);

				const result = await storeDefinition.controls.FETCH_SAVE_SETTINGS( {
					type: 'FETCH_SAVE_SETTINGS',
					payload: { values: {} },
				} );
				expect( result ).toEqual( response );
				// Ensure `console.error()` wasn't called, which will happen if the API
				// request fails.
				expect( global.console.error ).not.toHaveBeenCalled();
			} );
		} );
	} );
} );
