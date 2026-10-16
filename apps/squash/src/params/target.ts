import type { ParamMatcher } from '@sveltejs/kit';
import { getSizeTarget } from '$lib/size-targets';

export const match: ParamMatcher = (param) => getSizeTarget(param) !== undefined;
