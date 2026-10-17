import { error } from '@sveltejs/kit';
import { SIZE_TARGETS, getSizeTarget } from '#lib/size-targets.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => SIZE_TARGETS.map((t) => ({ target: t.slug }));

export const load: PageLoad = ({ params }) => {
	const target = getSizeTarget(params.target);
	if (!target) error(404, 'Page not found');
	return { target };
};
