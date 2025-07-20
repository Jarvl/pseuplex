import * as plexTypes from '../plex/types';
import { PlexClient } from '../plex/client';
import { PseuplexRequestContext } from './types';
import { findInArrayOrSingle, firstOrSingle } from '../utils/misc';

export type PlexMetadataMatchStoreOptions = {
	plexServerURL: string,
	plexAuthContext: plexTypes.PlexAuthContext
};

export class PlexMetadataMatchStore {
	_options: PlexMetadataMatchStoreOptions;
	_tmdbIdsToPlexGuids: { [key: string]: string } = {};
	_imdbIdsToPlexGuids: { [key: string]: string } = {};

	constructor(options: PlexMetadataMatchStoreOptions) {
		this._options = options;
	}
}

export type PlexMediaItemMatchParams = {
	title: string,
	year?: number | string,
	types: plexTypes.PlexMediaItemTypeNumeric | plexTypes.PlexMediaItemTypeNumeric[],
	guids: `${string}://${string}`[],
	includeFields?: string[],
	excludeElements?: string[],
};

export const findMatchingPlexMediaItem = async (metadataClient: PlexClient, params: PlexMediaItemMatchParams, context: PseuplexRequestContext): Promise<plexTypes.PlexMetadataItem | null> => {
	// match against guids
	if(params.guids) {
		for(const guid of params.guids) {
			const matchesPage = await metadataClient.getMatches({
				type: params.types,
				guid,
				includeFields: params.includeFields,
				excludeElements: params.excludeElements,
			}, {
				authContext: context.plexAuthContext
			});
			const metadataItem = firstOrSingle(matchesPage.MediaContainer.Metadata);
			if(metadataItem) {
				return metadataItem;
			}
		}
	}
	// no matches against guids, so try finding by title and year if possible
	if(params.year) {
		const matchesPage = await metadataClient.getMatches({
			type: params.types,
			title: params.title,
			year: params.year as number
		});
		const lowercaseTitle = params.title.toLowerCase();
		const metadataItem = findInArrayOrSingle(matchesPage.MediaContainer.Metadata, (metadataItem) => {
			return (metadataItem.title.toLowerCase() == lowercaseTitle && metadataItem.year == params.year);
		});
		if(metadataItem) {
			return metadataItem;
		}
	}
	return null;
};
