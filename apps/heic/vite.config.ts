import { createViteConfig } from '@neutron/config/vite.config';

export default createViteConfig({
	basePath: '/HEICConverter',
	wasmWorkers: true,
	optimizeDepsExclude: ['icodec', 'heic2any'],
});
