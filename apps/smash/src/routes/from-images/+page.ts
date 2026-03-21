import { redirect } from '@sveltejs/kit';
export function load() { redirect(301, '/workspace?tool=images-to-pdf'); }
