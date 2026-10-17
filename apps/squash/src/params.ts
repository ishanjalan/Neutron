import { defineParams } from '@sveltejs/kit/params';
import { getSizeTarget } from '#lib/size-targets.ts';

const matchTarget = (param: string) => getSizeTarget(param) !== undefined;

export const params = defineParams({
	target: (param) => (matchTarget(param) ? param : undefined),
});
