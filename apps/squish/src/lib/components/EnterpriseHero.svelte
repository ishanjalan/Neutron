<script lang="ts">
	import { Zap, TrendingDown, Shield, Gauge, Activity, Database, Cpu } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { spring } from 'svelte/motion';
	import { onMount } from 'svelte';

	let mounted = $state(false);

	// Real-time metrics simulation
	let bandwidth = spring(0, { stiffness: 0.05, damping: 0.3 });
	let efficiency = spring(0, { stiffness: 0.05, damping: 0.3 });
	let throughput = spring(0, { stiffness: 0.05, damping: 0.3 });

	// Data stream positions
	let streams = $state<number[]>([]);

	onMount(() => {
		mounted = true;

		// Animate metrics
		bandwidth.set(87.3);
		efficiency.set(94.1);
		throughput.set(12.4);

		// Generate data streams
		streams = Array.from({ length: 20 }, (_, i) => i * 5);

		return () => {};
	});

	function handleInitialize() {
		// Scroll to the drop zone and trigger file picker
		const dropZone = document.querySelector('[aria-label="Drop zone for image files"]');
		if (dropZone) {
			dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Small delay to let scroll complete, then trigger click (opens file picker)
			setTimeout(() => {
				(dropZone as HTMLElement).click();
			}, 400);
		}
	}

	function handleViewDocs() {
		// Scroll to the settings panel
		const settings = document.getElementById('settings-panel');
		if (settings) {
			settings.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<!-- Enterprise Hero - Mission Control Style -->
<div class="relative overflow-hidden py-20 sm:py-32" in:fade={{ duration: 300 }}>
	<!-- Background: Technical Grid (decorative, non-interactive) -->
	<div class="data-grid pointer-events-none absolute inset-0 opacity-40"></div>

	<!-- Scan Line Effect (decorative, non-interactive) -->
	<div class="scan-line pointer-events-none absolute inset-0"></div>

	<!-- Data Streams (decorative, non-interactive) -->
	{#each streams as delay, i}
		<div
			class="data-stream pointer-events-none absolute top-0"
			style="left: {(i / streams.length) * 100}%; animation-delay: {delay * 0.1}s;"
		></div>
	{/each}

	<div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Mission Status Badge -->
		<div class="mb-8 flex items-center justify-center gap-4" in:fly={{ y: -20, duration: 400 }}>
			<div class="panel-enterprise flex items-center gap-2 rounded-full px-6 py-2">
				<Activity class="text-data-cyan h-4 w-4 animate-pulse" />
				<span class="data-label">SYSTEM STATUS: OPERATIONAL</span>
			</div>
		</div>

		<!-- Main Headline -->
		<div class="mb-12 text-center" in:fly={{ y: 20, duration: 400, delay: 100 }}>
			<h1 class="heading-enterprise mb-6 text-4xl sm:text-5xl lg:text-7xl">
				ENTERPRISE IMAGE
				<br />
				<span class="text-data-cyan">OPTIMIZATION</span>
				<br />
				INFRASTRUCTURE
			</h1>
			<p class="text-infrastructure-300 mx-auto max-w-3xl text-lg sm:text-xl">
				Mission-critical image compression for organizations that demand
				<span class="text-data-cyan font-semibold">zero-compromise performance</span>,
				<span class="text-data-green font-semibold">100% data privacy</span>, and
				<span class="text-data-blue font-semibold">industrial-grade reliability</span>.
			</p>
		</div>

		<!-- Real-Time Metrics Dashboard -->
		<div
			class="mx-auto mb-16 grid max-w-5xl gap-4 sm:grid-cols-3"
			in:fly={{ y: 20, duration: 400, delay: 200 }}
		>
			<!-- Metric 1: Bandwidth Saved -->
			<div
				class="panel-enterprise hover:border-data-cyan group relative overflow-hidden rounded-lg p-6 transition-all"
			>
				<div
					class="holographic pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center justify-between">
						<span class="data-label">BANDWIDTH SAVED</span>
						<TrendingDown class="text-data-green h-5 w-5" />
					</div>
					<div class="metric-value mb-2">
						{mounted ? $bandwidth.toFixed(1) : 0}<span class="text-2xl">%</span>
					</div>
					<div class="stat-bar" style="--stat-value: {mounted ? $bandwidth : 0}%"></div>
					<p class="text-infrastructure-400 mt-3 text-sm">Average reduction across all formats</p>
				</div>
			</div>

			<!-- Metric 2: System Efficiency -->
			<div
				class="panel-enterprise hover:border-data-cyan group relative overflow-hidden rounded-lg p-6 transition-all"
			>
				<div
					class="holographic pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center justify-between">
						<span class="data-label">SYSTEM EFFICIENCY</span>
						<Cpu class="text-data-cyan h-5 w-5" />
					</div>
					<div class="metric-value mb-2">
						{mounted ? $efficiency.toFixed(1) : 0}<span class="text-2xl">%</span>
					</div>
					<div class="stat-bar" style="--stat-value: {mounted ? $efficiency : 0}%"></div>
					<p class="text-infrastructure-400 mt-3 text-sm">WASM-powered parallel processing</p>
				</div>
			</div>

			<!-- Metric 3: Throughput -->
			<div
				class="panel-enterprise hover:border-data-cyan group relative overflow-hidden rounded-lg p-6 transition-all"
			>
				<div
					class="holographic pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center justify-between">
						<span class="data-label">THROUGHPUT</span>
						<Gauge class="text-data-blue h-5 w-5" />
					</div>
					<div class="metric-value mb-2">
						{mounted ? $throughput.toFixed(1) : 0}<span class="text-2xl">GB/s</span>
					</div>
					<div
						class="stat-bar"
						style="--stat-value: {mounted ? ($throughput / 20) * 100 : 0}%"
					></div>
					<p class="text-infrastructure-400 mt-3 text-sm">Batch processing capacity</p>
				</div>
			</div>
		</div>

		<!-- Enterprise Features Grid -->
		<div
			class="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4"
			in:fly={{ y: 20, duration: 400, delay: 300 }}
		>
			<!-- Feature 1 -->
			<div
				class="panel-enterprise hover:border-data-cyan hover:shadow-data-cyan/20 group rounded-lg p-6 transition-all hover:shadow-lg"
			>
				<div
					class="from-data-cyan/20 to-data-blue/20 border-data-cyan/30 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br"
				>
					<Zap class="text-data-cyan h-6 w-6" />
				</div>
				<h3 class="data-label mb-2 text-sm">ZERO-LATENCY</h3>
				<p class="text-infrastructure-300 text-sm">
					Client-side processing eliminates network bottlenecks
				</p>
			</div>

			<!-- Feature 2 -->
			<div
				class="panel-enterprise hover:border-data-green hover:shadow-data-green/20 group rounded-lg p-6 transition-all hover:shadow-lg"
			>
				<div
					class="from-data-green/20 border-data-green/30 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br to-emerald-500/20"
				>
					<Shield class="text-data-green h-6 w-6" />
				</div>
				<h3 class="data-label mb-2 text-sm">100% PRIVATE</h3>
				<p class="text-infrastructure-300 text-sm">
					Files never leave your infrastructure perimeter
				</p>
			</div>

			<!-- Feature 3 -->
			<div
				class="panel-enterprise hover:border-data-blue hover:shadow-data-blue/20 group rounded-lg p-6 transition-all hover:shadow-lg"
			>
				<div
					class="from-data-blue/20 border-data-blue/30 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br to-indigo-500/20"
				>
					<Database class="text-data-blue h-6 w-6" />
				</div>
				<h3 class="data-label mb-2 text-sm">BATCH SCALE</h3>
				<p class="text-infrastructure-300 text-sm">Process thousands of assets concurrently</p>
			</div>

			<!-- Feature 4 -->
			<div
				class="panel-enterprise hover:border-data-amber hover:shadow-data-amber/20 group rounded-lg p-6 transition-all hover:shadow-lg"
			>
				<div
					class="from-data-amber/20 border-data-amber/30 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br to-orange-500/20"
				>
					<Activity class="text-data-amber h-6 w-6" />
				</div>
				<h3 class="data-label mb-2 text-sm">REAL-TIME MONITORING</h3>
				<p class="text-infrastructure-300 text-sm">Comprehensive telemetry and error tracking</p>
			</div>
		</div>

		<!-- CTA Buttons -->
		<div
			class="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
			in:fly={{ y: 20, duration: 400, delay: 400 }}
		>
			<button class="btn-enterprise-primary rounded-lg" onclick={handleInitialize}>
				<Zap class="mr-2 inline h-5 w-5" />
				INITIALIZE SYSTEM
			</button>
			<button class="btn-enterprise-secondary rounded-lg" onclick={handleViewDocs}>
				<Activity class="mr-2 inline h-5 w-5" />
				VIEW DOCUMENTATION
			</button>
		</div>

		<!-- System Status Footer -->
		<div
			class="mt-12 flex items-center justify-center gap-8 text-sm"
			in:fade={{ duration: 400, delay: 500 }}
		>
			<div class="flex items-center gap-2">
				<div class="data-point relative h-2 w-2"></div>
				<span class="data-label text-xs">UPTIME: 99.99%</span>
			</div>
			<div class="bg-infrastructure-700 h-4 w-px"></div>
			<div class="flex items-center gap-2">
				<div
					class="data-point relative h-2 w-2"
					style="--color-data-cyan: var(--color-data-green)"
				></div>
				<span class="data-label text-xs">SECURITY: A+</span>
			</div>
			<div class="bg-infrastructure-700 h-4 w-px"></div>
			<div class="flex items-center gap-2">
				<div
					class="data-point relative h-2 w-2"
					style="--color-data-cyan: var(--color-data-blue)"
				></div>
				<span class="data-label text-xs">COMPLIANCE: SOC 2</span>
			</div>
		</div>
	</div>
</div>
