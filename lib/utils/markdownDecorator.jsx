import React from 'react';
import SimpleDecorator from 'draft-js-simpledecorator';
import {
	attempt,
	get,
	isError,
} from 'lodash';

import { parse } from './note-parser';

const simpleTypes = {
	'at-mention': 'at-mention',
	'code-inline': 'code-inline',
	em: 'em',
	strong: 'strong',
	strike: 'strikethrough',
};

const addMissingScheme = url =>
	/^[a-zA-Z0-9\-.]+:\/\//.test( url )
		? url
		: `http://${ url }`;

const openLink = event => {
	const { metaKey } = event;

	if ( ! metaKey ) {
		return;
	}

	const anchor = event.target.parentNode.parentNode;
	const url = anchor.href;

	window.open( url, '_blank' );
};

const provideClassName = ( [ start, end ], className, callback ) =>
		callback( start, end, { type: 'addClass', className } );

const strategy = ( contentBlock, callback ) => {
	const content = contentBlock.getText();
	const parsed = attempt( parse, content );

	if ( isError( parsed ) ) {
		// if the parser fails, then we
		// can safely ignore processing
		// the content.
		return;
	}

	parsed.forEach( item => {
		const className = get( simpleTypes, item.type, false );

		if ( className ) {
			return provideClassName( item.location, className, callback );
		}

		if ( [ 'blockquote', 'header' ].includes( item.type ) ) {
			const [ start, end ] = item.location;

			return callback( start, end, { type: item.type, level: item.level } );
		}

		if ( [ 'list-bullet', 'todo-bullet' ].includes( item.type ) ) {
			const [ start, end ] = item.bulletLocation;
			const className = `${ item.type } bullet`;

			return callback( start, end, { type: item.type, className } );
		}

		if ( 'link' === item.type ) {
			const [ start, end ] = item.urlLocation;

			return callback( start, end, { type: 'link', url: item.url } );
		}
	} );
};

const ClassWrapper = ( { children, className } ) =>
	<span { ...{ className } }>{ children }</span>;

const Blockquote = ( { children, level } ) =>
	<span { ...{ className: `blockquote level-${ level }` } }>{ children }</span>;

const Header = ( { children, level } ) =>
	<div { ...{ className: `header level-${ level }` } }>{ children }</div>;

const Link = ( { url, children } ) =>
	<a href={ addMissingScheme( url ) } onClick={ openLink }>{ children }</a>;

const UndecoratedSpan = props => <span>{ props.children }</span>;

const DecoratedComponent = props => get( {
	addClass: ClassWrapper,
	blockquote: Blockquote,
	header: Header,
	link: Link,
	'list-bullet': ClassWrapper,
	'todo-bullet': ClassWrapper,
}, props.type, UndecoratedSpan )( props );

export const markdownDecorator = new SimpleDecorator( strategy, DecoratedComponent );

export default markdownDecorator;
