/**
 * FormInstructions component.
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
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import Link from '../../../components/link';

export default function FormInstructions() {
	return (
		<p>
			{ __( 'Please copy and paste your Optimize ID to complete your setup.', 'google-site-kit' ) }
			{ ' ' }
			<Link
				href="https://support.google.com/optimize/answer/6211921"
				external
				inherit
			>
				{ __( 'You can locate this here.', 'google-site-kit' ) }
			</Link>
		</p>
	);
}