import { createViteConfig } from '@neutron/config/vite.config';

export default createViteConfig({
	wasmWorkers: true,
	optimizeDepsExclude: ['icodec'],
});
