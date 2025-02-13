
import xml2js from 'xml2js';
import express from 'express';

export const parseHttpContentType = (contentType: string): {contentType: string, contentTypeSuffix: string} => {
	if(!contentType) {
		return { contentType, contentTypeSuffix: '' };
	}
	// find delimeter
	let commaIndex = contentType.indexOf(',');
	let semicolonIndex = contentType.indexOf(';');
	let delimeterIndex;
	if(commaIndex != -1) {
		if(semicolonIndex != -1) {
			if(commaIndex < semicolonIndex) {
				delimeterIndex = commaIndex;
			} else {
				delimeterIndex = semicolonIndex;
			}
		} else {
			delimeterIndex = commaIndex;
		}
	} else {
		delimeterIndex = semicolonIndex;
	}
	// slice string
	let contentTypeSuffix = '';
	if(delimeterIndex != -1) {
		contentTypeSuffix = contentType.substring(delimeterIndex);
		contentType = contentType.substring(0, delimeterIndex);
	}
	return {contentType,contentTypeSuffix};
};

export const parseHttpContentTypeFromHeader = (req: express.Request, header: string) => {
	let contentType = req.headers[header];
	if(contentType instanceof Array) {
		contentType = contentType[0];
	}
	return parseHttpContentType(contentType);
};

const attrKey = '$';

const xmlToJsonParser = new xml2js.Parser({
	explicitRoot: true,
	explicitArray: true,
	attrkey: attrKey as any
	//mergeAttrs: true
});

export const plexXMLToJS = async (xmlString: string): Promise<any> => {
	const parsedXml = await xmlToJsonParser.parseStringPromise(xmlString);
	return mergeXML2JSAttrs(parsedXml);
};

const mergeXML2JSAttrs = (obj: object) => {
	if(obj instanceof Array) {
		for(const element of obj) {
			mergeXML2JSAttrs(element);
		}
	} else {
		const attrs = obj[attrKey];
		delete obj[attrKey];
		for(const key in obj) {
			const element = obj[key];
			if(element != null && typeof element === 'object') {
				mergeXML2JSAttrs(element);
			}
		}
		Object.assign(obj, attrs);
	}
	return obj;
};

const convertPlexJSForXMLBuilder = (json: any, parentKey: string) => {
	const xmlObj = {};
	const xmlAttrs = {};
	for(const key in json) {
		const val = json[key];
		if(val == null) {
			// ignore
			continue;
		}
		const valType = typeof val;
		if(valType === 'string' || valType === 'number' || valType === 'boolean') {
			xmlAttrs[key] = val;
		} else if(val instanceof Array) {
			xmlObj[key] = val.map((element) => convertPlexJSForXMLBuilder(element, key));
		} else {
			xmlObj[key] = convertPlexJSForXMLBuilder(val, key);
		}
	}
	xmlObj[attrKey] = xmlAttrs;
	return xmlObj;
};

export const plexJSToXML = (json: any): string => {
	// get the root key
	const rootKeys = Object.keys(json);
	if(rootKeys.length != 1) {
		console.error(`1 key should exist in the root object, but found ${rootKeys.length} (${rootKeys.join(", ")})`);
	}
	const rootKey = rootKeys[0];
	// reformat for xml builder
	if(rootKey) {
		json = json[rootKey];
	}
	json = convertPlexJSForXMLBuilder(json, rootKey);
	// convert
	const xmlBuilder = new xml2js.Builder({
		rootName: rootKey,
		attrkey: attrKey as any
	});
	return xmlBuilder.buildObject(json);
};


export const serializeResponseContent = (userReq: express.Request, userRes: express.Response, data: any): {
	contentType: string;
	data: string;
 } => {
	const acceptType = parseHttpContentTypeFromHeader(userReq, 'accept').contentType;
	if(acceptType == 'application/json') {
		return {
			contentType: 'application/json',
			data: JSON.stringify(data)
		}
	} else {
		// convert to xml
		return {
			contentType: acceptType || 'application/xml',
			data: plexJSToXML(data)
		};
	}
};
