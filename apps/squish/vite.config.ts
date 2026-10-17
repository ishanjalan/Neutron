import { createViteConfig } from '@neutron/config/vite.config';

export default createViteConfig({
	basePath: '/Squish',
	wasmWorkers: true,
	optimizeDepsExclude: ['icodec'],
});
