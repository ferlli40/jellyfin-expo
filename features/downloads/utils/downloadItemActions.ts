/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';

import type DownloadModel from '../../../models/DownloadModel';
import { DownloadAction } from '../constants/DownloadAction';
import type { DownloadItemAction } from '../types/downloadItemAction';

export const getDownloadItemActions = (download: DownloadModel): DownloadItemAction[] => {
	// NOTE: Currently only video has a native UI to play within the app.
	// The media type check should be removed when we have a native audio player UI available.
	const isPlayableInApp = download.canPlay && download.item.MediaType === MediaType.Video;

	return [
		{
			id: DownloadAction.PlayInApp,
			title: 'common.play',
			image: 'play',
			isDefault: true,
			isEnabled: true,
			isSupported: isPlayableInApp
		},
		{
			id: DownloadAction.OpenInFiles,
			title: 'common.openInFiles',
			image: 'folder',
			isDefault: true,
			isEnabled: true,
			isSupported: true
		},
		{
			id: DownloadAction.Share,
			title: 'common.share',
			image: 'square.and.arrow.up',
			isEnabled: true,
			isSupported: true
		},
		{
			id: DownloadAction.Delete,
			title: 'common.delete',
			image: 'trash',
			isDestructive: true,
			isEnabled: true,
			isSupported: true
		}
	];
};
