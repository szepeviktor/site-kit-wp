/**
 * Analytics Setup stories.
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
import { storiesOf } from '@storybook/react';

/**
 * WordPress dependencies
 */
import { removeAllFilters, addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import SetupWrapper from '../assets/js/components/setup/setup-wrapper';
import { AnalyticsSetup } from '../assets/js/modules/analytics/setup/index';
import { fillFilterWithComponent } from '../assets/js/util';
import * as fixtures from '../assets/js/modules/analytics/datastore/__fixtures__';

import { STORE_NAME } from '../assets/js/modules/analytics/datastore';
import { WithTestRegistry } from '../tests/js/utils';

function filterAnalyticsSetup() {
	global.googlesitekit.setup.moduleToSetup = 'analytics';

	removeAllFilters( 'googlesitekit.ModuleSetup-analytics' );
	addFilter(
		'googlesitekit.ModuleSetup-analytics',
		'googlesitekit.AnalyticsModuleSetup',
		fillFilterWithComponent( AnalyticsSetup )
	);
}

storiesOf( 'Analytics Module Setup', module )
	.add( 'Start', () => {
		filterAnalyticsSetup();

		const { accounts, properties, profiles } = fixtures.accountsPropertiesProfiles;
		const setupRegistry = ( { dispatch } ) => {
			dispatch( STORE_NAME ).receiveSettings( {} );
			dispatch( STORE_NAME ).receiveAccounts( accounts );
			dispatch( STORE_NAME ).receiveProperties( properties );
			dispatch( STORE_NAME ).receiveProfiles( profiles );
		};

		return (
			<WithTestRegistry callback={ setupRegistry }>
				<SetupWrapper />
			</WithTestRegistry>
		);
	} )
	.add( 'No Accounts', () => {
		filterAnalyticsSetup();

		const setupRegistry = ( { dispatch } ) => {
			dispatch( STORE_NAME ).receiveSettings( {} );
			dispatch( STORE_NAME ).receiveAccounts( [] );
		};

		return (
			<WithTestRegistry callback={ setupRegistry }>
				<SetupWrapper />
			</WithTestRegistry>
		);
	} )
	.add( 'Existing Tag', () => {
		filterAnalyticsSetup();

		const { accounts, properties, profiles } = fixtures.accountsPropertiesProfiles;
		const setupRegistry = ( { dispatch } ) => {
			dispatch( STORE_NAME ).receiveSettings( {} );
			dispatch( STORE_NAME ).receiveAccounts( accounts );
			dispatch( STORE_NAME ).receiveProperties( properties );
			dispatch( STORE_NAME ).receiveProfiles( profiles );
			dispatch( STORE_NAME ).receiveExistingTag( fixtures.getTagPermissionsAccess );
		};

		return (
			<WithTestRegistry callback={ setupRegistry }>
				<SetupWrapper />
			</WithTestRegistry>
		);
	} )
;
