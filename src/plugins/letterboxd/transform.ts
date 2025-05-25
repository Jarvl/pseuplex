
import * as letterboxd from 'letterboxd-retriever';
import * as plexTypes from '../../plex/types';
import {
	PseuplexMetadataItem,
	PseuplexMetadataSource
} from '../../pseuplex/types';
import {
	parsePartialMetadataID,
	PseuplexMetadataIDString,
	PseuplexPartialMetadataIDString,
	stringifyMetadataID,
	stringifyPartialMetadataID
} from '../../pseuplex/metadataidentifier';
import { PseuplexMetadataTransformOptions } from '../../pseuplex/metadata';
import { PseuplexHubContext } from '../../pseuplex/hub';
import {
	intParam,
	combinePathSegments
} from '../../utils';
import { LetterboxdMetadataProvider } from './metadata';

export const partialMetadataIdFromFilmInfo = (filmInfo: letterboxd.FilmInfo): PseuplexPartialMetadataIDString => {
	return stringifyPartialMetadataID({
		directory: filmInfo.pageData.type,
		id: filmInfo.pageData.slug
	});
};

export const getFilmOptsFromPartialMetadataId = (metadataId: PseuplexPartialMetadataIDString): letterboxd.FilmURLOptions => {
	const idParts = parsePartialMetadataID(metadataId);
	if(!idParts.directory) {
		if(idParts.id.indexOf('/') != -1) {
			return {href:idParts.id};
		} else {
			return {filmSlug:idParts.id};
		}
	} else {
		return {href:`/${idParts.directory}/${idParts.id}/`};
	}
};

export const fullMetadataIdFromFilmInfo = (filmInfo: letterboxd.FilmInfo, opts:{asUrl: boolean}): PseuplexMetadataIDString => {
	return stringifyMetadataID({
		isURL: opts.asUrl,
		source: PseuplexMetadataSource.Letterboxd,
		directory: filmInfo.pageData.type ?? 'film',
		id: filmInfo.pageData.slug
	});
};

export const filmInfoToPlexMetadata = (filmInfo: letterboxd.FilmInfo, options: PseuplexMetadataTransformOptions): PseuplexMetadataItem => {
	const releasedEvent = filmInfo.ldJson.releasedEvent;
	const partialMetadataId = partialMetadataIdFromFilmInfo(filmInfo);
	const fullMetadataId = fullMetadataIdFromFilmInfo(filmInfo,{asUrl:false});
	return {
		// guid: fullMetadataIdFromFilmInfo(filmInfo, {asUrl:true}),
		key: combinePathSegments(options.metadataBasePath, options.qualifiedMetadataId ? fullMetadataId : partialMetadataId),
		ratingKey: fullMetadataId,
		type: plexTypes.PlexMediaItemType.Movie,
		title: filmInfo.ldJson.name,
		art: filmInfo.pageData.backdrop.default,
		thumb: filmInfo.ldJson.image,
		tagline: filmInfo.pageData.tagline,
		summary: filmInfo.pageData.description,
		year: intParam(releasedEvent?.[0]?.startDate),
		Pseuplex: {
			isOnServer: false,
			metadataIds: {
				[PseuplexMetadataSource.Letterboxd]: partialMetadataId
			}
		},
		Guid: filmInfoGuids(filmInfo).map((guid) => {
			return {id:guid};
		}),
		Director: filmInfo.ldJson?.director?.map((directorInfo): plexTypes.PlexPerson => {
			return {
				tag: directorInfo.name,
				role: "Director"
			} as plexTypes.PlexPerson;
		}) ?? undefined,
		Role: filmInfo.pageData?.cast?.map((actorInfo): plexTypes.PlexPerson => {
			return {
				tag: actorInfo.name,
				role: actorInfo.role
			} as plexTypes.PlexPerson;
		}) ?? undefined,
		Writer: filmInfo.pageData?.crew
			?.filter((crewMember) => (crewMember.role == letterboxd.CrewRoleType.Writer))
			.map((crewMember): plexTypes.PlexPerson => {
				return {
					tag: crewMember.name,
					role: crewMember.role
				} as plexTypes.PlexPerson;
			}) ?? undefined,
		Review: filmInfo.pageData.popularReviews?.map((viewing) => {
			return viewingToPlexReview(viewing);
		})
	};
};

export const filmInfoGuids = (filmInfo: letterboxd.FilmInfo) => {
	let guids: `${string}://${string}`[] = [];
	const tmdbInfo = filmInfo.pageData.tmdb;
	if(tmdbInfo && tmdbInfo.id) {
		guids.push(`tmdb://${tmdbInfo.id}`);
	}
	const imdbInfo = filmInfo.pageData.imdb;
	if(imdbInfo && imdbInfo.id) {
		guids.push(`imdb://${imdbInfo.id}`);
	}
	return guids;
};

export const partialMetadataIdFromFilm = (film: letterboxd.Film): PseuplexPartialMetadataIDString => {
	return stringifyPartialMetadataID({
		directory: film.type,
		id: film.slug
	});
};

export const fullMetadataIdFromFilm = (film: letterboxd.Film, opts:{asUrl:boolean}): PseuplexMetadataIDString => {
	return stringifyMetadataID({
		isURL: opts.asUrl,
		source: PseuplexMetadataSource.Letterboxd,
		directory: film.type,
		id: film.slug
	});
};

export const filmToPlexMetadata = (film: letterboxd.Film, options: PseuplexMetadataTransformOptions): plexTypes.PlexMetadataItem => {
	const fullMetadataId = fullMetadataIdFromFilm(film, {asUrl:false});
	const metadataId = options.qualifiedMetadataId ? fullMetadataId : partialMetadataIdFromFilm(film);
	return {
		// guid: fullMetadataIdFromFilm(film, {asUrl:true}),
		key: combinePathSegments(options.metadataBasePath, metadataId),
		ratingKey: fullMetadataId,
		type: plexTypes.PlexMediaItemType.Movie,
		title: film.name,
		thumb: film.imageURL,
		year: intParam(film.year)
	};
};

export const transformLetterboxdFilmHubEntry = async (film: letterboxd.Film, context: PseuplexHubContext, metadataProvider: LetterboxdMetadataProvider, metadataTransformOptions: PseuplexMetadataTransformOptions): Promise<plexTypes.PlexMetadataItem> => {
	const metadataId = partialMetadataIdFromFilm(film);
	const metadataItem = filmToPlexMetadata(film, metadataTransformOptions);
	const section = metadataProvider.section;
	if(section) {
		Object.assign(metadataItem, {
			librarySectionID: section.id,
			librarySectionTitle: section.title,
			librarySectionKey: section.path,
		});
	}
	return await metadataProvider.attachPlexDataIfAble(metadataId, metadataItem, {
		plexServerURL: context.plexServerURL,
		plexAuthContext: context.plexAuthContext
	});
}

export const viewingToPlexReview = (viewing: letterboxd.Viewing): plexTypes.PlexReview => {
	let ratingString: string;
	if(viewing.rating) {
		const solidRating = Math.floor(viewing.rating / 2);
		const halfRating = viewing.rating % 2;
		ratingString = `${'★'.repeat(solidRating)}${'½'.repeat(halfRating)}`;
	}
	return {
		source: "Letterboxd",
		tag: viewing.user.displayName,
		image: (viewing.rating && viewing.rating < 5) ? "rottentomatoes://image.rating.spilled" : "rottentomatoes://image.rating.upright",
		link: letterboxd.BASE_URL + viewing.href,
		text: ratingString ? `${ratingString}\n${viewing.text ?? ''}` : viewing.text
	};
};
