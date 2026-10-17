import { createViteConfig } from '@neutron/config/vite.config';

export default createViteConfig({
	basePath: '/Swirl',
	crossOriginIsolation: true,
	optimizeDepsExclude: ['gifski-wasm'],
});
