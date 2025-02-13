
import qs from 'querystring';
import * as plexTypes from '../plex/types';
import { parseMetadataIDFromKey } from '../plex/metadataidentifier';
import { CachedFetcher } from '../fetching/CachedFetcher';


export type PseuplexHubPage = {
	hub: plexTypes.PlexHub;
	items: plexTypes.PlexMetadataItem[];
	offset?: number;
	totalItemCount?: number;
	more: boolean;
}

export type PseuplexHubPageParams = plexTypes.PlexHubPageParams & {
	listStartToken?: string | null | undefined;
};

export type PseuplexHubContext = {
	plexServerURL: string;
	plexAuthContext: plexTypes.PlexAuthContext;
};

export abstract class PseuplexHub {
	get metadataBasePath() {
		return '/library/metadata/';
	}
	
	abstract get(params: PseuplexHubPageParams, context: PseuplexHubContext): Promise<PseuplexHubPage>;
	
	async getHub(params: PseuplexHubPageParams, context: PseuplexHubContext): Promise<plexTypes.PlexHubPage> {
		const page = await this.get(params, context);
		return {
			MediaContainer: {
				size: (page.items?.length ?? 0),
				totalSize: page.totalItemCount,
				offset: page.offset,
				allowSync: false, // TODO figure out what this does
				identifier: plexTypes.PlexPluginIdentifier.PlexAppLibrary, // TODO figure out what this does
				Meta: {
					Type: [
						{
							key: page.hub.key,
							type: page.hub.type,
							title: page.hub.title,
							active: (page.totalItemCount != 0)
						}
					]
				},
				Metadata: page.items
			}
		};
	}
	
	async getHubListEntry(params: PseuplexHubPageParams, context: PseuplexHubContext): Promise<plexTypes.PlexHubWithItems> {
		const page = await this.get(params, context);
		let metadataBasePath = this.metadataBasePath;
		if(metadataBasePath && !metadataBasePath.endsWith('/')) {
			metadataBasePath += '/';
		}
		const metadataIds = page.items
			.map((item) => {
				let metadataId = parseMetadataIDFromKey(item.key, metadataBasePath)?.id;
				if (!metadataId) {
					metadataId = item.ratingKey;
				}
				return metadataId;
			})
			.filter((metadataId) => metadataId);
		return {
			...page.hub,
			hubKey: metadataIds.length > 0 ? `${metadataBasePath}${metadataIds.join(',')}` : undefined,
			size: (page.items?.length ?? 0),
			more: page.more,
			Metadata: page.items
		};
	}
}



export abstract class PseuplexHubProvider<THub extends PseuplexHub = PseuplexHub> {
	readonly cache: CachedFetcher<THub>;

	constructor() {
		this.cache = new CachedFetcher<THub>(async (id: string) => {
			return await this.fetch(id);
		});
	}

	abstract fetch(id: string): (THub | Promise<THub>);

	async get(id: string): Promise<THub> {
		return this.cache.getOrFetch(id);
	}
}
