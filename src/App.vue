<script setup lang="ts">
import { canvas, cleanup } from './scene.ts';
import { onBeforeUnmount, ref, watch } from 'vue';
onBeforeUnmount(cleanup);
const canvasHolder = ref<HTMLDivElement | null>(null);
watch(canvasHolder, (div) => {
	if (!div) {
		return;
	}
	div.appendChild(canvas);
});
</script>

<template>
	<div id="overlay">
		<h1>Geep Wiggler</h1>
	</div>
	<div
		id="canvas-holder"
		ref="canvasHolder"
	></div>
</template>

<style>
#overlay {
	position: relative;
	z-index: 1;
}
#canvas-holder {
	height: 100vh;
	width: 100vw;
	position: absolute;
	top: 0;
	left: 0;
}
canvas {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
