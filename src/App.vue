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
	<div
		id="label-overlay"
		contenteditable
		spellcheck="false"
	>
		yay! hooray! yippee!
	</div>
</template>

<style>
#overlay {
	position: relative;
	z-index: 1;
}
#label-overlay {
	position: absolute;
	z-index: 1;
	bottom: 16px;
	left: 0;
	right: 0;
	text-align: center;
	font-size: 10dvh;
	line-height: 1.25em;
	color: #fff;
	text-shadow:
		-2px -2px 1px #000,
		-2px 1px 1px #000,
		2px -2px 1px #000,
		2px -1px 1px #000,
		-2px 2px 1px #000,
		-1px 2px 1px #000,
		2px 2px 1px #000,
		1px 2px 1px #000;
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
