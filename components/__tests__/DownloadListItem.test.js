/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DownloadStatus } from '../../constants/DownloadStatus';
import DownloadModel from '../../models/DownloadModel';
import DownloadListItem from '../DownloadListItem';

describe('DownloadListItem', () => {
	let model;

	beforeEach(() => {
		jest.resetModules();

		model = new DownloadModel(
			{
				Id: 'item-id',
				ServerId: 'server-id',
				Name: 'title',
				MediaType: MediaType.Video
			},
			'https://example.com/',
			'api-key',
			'file name.mkv',
			'https://example.com/download'
		);
	});

	it('should render correctly', () => {
		const onPlay = jest.fn();
		const onSelect = jest.fn();

		model.status = DownloadStatus.Downloading;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				onSelect={onSelect}
				onPlay={onPlay}
				onDelete={() => { /* no-op */ }}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).not.toBeNull();
	});

	it('should display the menu and handle presses', () => {
		const onPlay = jest.fn();
		const onDelete = jest.fn();

		model.canPlay = true;
		model.status = DownloadStatus.Complete;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				onSelect={() => { /* no-op */ }}
				onPlay={onPlay}
				onDelete={onDelete}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).toBeNull();

		// Pressing the list item should call onPlay when not editing
		expect(onPlay).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('list-item'));
		expect(onPlay).toHaveBeenCalledTimes(1);
		// Pressing the play menu action should call onPlay
		expect(queryByTestId('play_in_app')).not.toBeNull();
		fireEvent.press(getByTestId('play_in_app'));
		expect(onPlay).toHaveBeenCalledTimes(2);
		// Pressing the delete menu action should call onDelete
		expect(onDelete).not.toHaveBeenCalled();
		expect(queryByTestId('delete')).not.toBeNull();
		fireEvent.press(getByTestId('delete'));
		expect(onDelete).toHaveBeenCalled();
	});

	it('should display the select checkbox and handle presses', () => {
		const onSelect = jest.fn();

		model.status = DownloadStatus.Complete;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				onSelect={onSelect}
				onPlay={() => { /* no-op */ }}
				isEditMode={true}
			/>
		);

		expect(queryByTestId('select-checkbox')).not.toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(onSelect).not.toHaveBeenCalled();

		// Pressing the list item and checkbox should call select
		fireEvent.press(getByTestId('list-item'));
		expect(onSelect).toHaveBeenCalledTimes(1);
		fireEvent.press(getByTestId('select-checkbox'));
		expect(onSelect).toHaveBeenCalledTimes(2);
	});

	it('should display a warning for failed downloads', () => {
		model.status = DownloadStatus.Failed;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				onSelect={jest.fn()}
				onPlay={jest.fn()}
				onDelete={jest.fn()}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('loading-indicator')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('failed-icon')).not.toBeNull();
	});
});
