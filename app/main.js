
function getCanvas() {
	return document.getElementById("xy");
}

function getCanvasContext() {
	return getCanvas().getContext("2d");
}

function getBriSlider() {
	return document.getElementById("bri");
}

function getInfoArea() {
	return document.getElementById("info");
}

function getNameButton() {
	return document.getElementById("name");
}

function getLightSwitch() {
	return document.getElementById("light");
}

function initUI() {
	// canvas

	let canvas = getCanvas();
	let scale = app.canvas.scale;

	function convertToXY(event) {
		let x = event.offsetX / app.canvas.width;
		let y = 1 - event.offsetY / app.canvas.height;
		return [
			lerp(x, app.canvas.minX, app.canvas.maxX),
			lerp(y, app.canvas.minY, app.canvas.maxY),
		];
	}

	canvas.style.width = app.canvas.width + "px";
	canvas.style.height = app.canvas.height + "px";
	canvas.width = (app.canvas.maxX - app.canvas.minX) * scale;
	canvas.height = (app.canvas.maxY - app.canvas.minY) * scale;

	canvas.addEventListener("pointerdown", function(event) {
		if ((event.buttons & 1) != 0) {
			onChangeXY(convertToXY(event));
			canvas.setPointerCapture(event.pointerId);
		}
	});

	canvas.addEventListener("pointerup", function(event) {
		if ((event.buttons & 1) == 0) {
			onFinishXY();
			canvas.releasePointerCapture(event.pointerId);
		}
	});

	canvas.addEventListener("pointermove", function(event) {
		if ((event.buttons & 1) != 0) {
			onChangeXY(convertToXY(event));
		}
	});

	// slider

	let slider = getBriSlider();

	slider.addEventListener("input", function(event) {
		onChangeBrightness(event.target.value);
	});

	slider.addEventListener("change", function(event) {});

	slider.disabled = true;
	slider.value = 0;

	// name

	getNameButton().addEventListener("click", function(event) {
		selectNextLight();
	})

	getNameButton().addEventListener("contextmenu", function(event) {
		selectPrevLight();
		event.preventDefault();
	})

	// light

	getLightSwitch().addEventListener("change", function(event) {
		enableLight(event.target.checked);
	});


	// reveal UI

	let opacity = 0;
	let container = document.getElementById("container");
	container.style.display = "block";
	container.style.opacity = "0%";

	function reveal() {
		opacity += 1;
		opacity = Math.min(opacity, 100);
		container.style.opacity = opacity + "%";

		if (opacity < 100) {
			window.setTimeout(reveal, 5);
		}
	}

	reveal();
}

function initCanvasContext() {
	let ctx = getCanvasContext();
	let scale = app.canvas.scale;;
	let minX = app.canvas.minX * scale;
	let minY = app.canvas.minY * scale;
	let maxX = app.canvas.maxX * scale;
	let maxY = app.canvas.maxY * scale;

	ctx.translate(minX, maxY);
	ctx.scale(scale, -scale);
}

function drawCieCurve() {
	let ctx = getCanvasContext();
	let waveMin = 4370;
	let waveMax = 6440;
	let curveResolution = 1000;

	ctx.lineWidth = 0.003;
	ctx.strokeStyle = "rgba(0, 0, 0, 0.25";
	ctx.beginPath();

	for (let i = 0; i <= curveResolution; ++i) {
		let t = i / curveResolution;
		let w = t * waveMax + (1 - t) * waveMin;

		let c = wavelengthToChromaticity(w);
		if (i == 0) {
			first = c;
			ctx.moveTo(c.x, c.y);
		} else {
			ctx.lineTo(c.x, c.y);
		}
	}

	ctx.stroke();
}

function drawCieDiagram() {
	let ctx = getCanvasContext();
	let colorResolution = 200;
	let gridResolution = 10;
	let gamut = app.gamut;

	let clipX0 = Math.min(gamut[0].x, gamut[1].x, gamut[2].x);
	let clipY0 = Math.min(gamut[0].y, gamut[1].y, gamut[2].y);
	let clipX1 = Math.max(gamut[0].x, gamut[1].x, gamut[2].x);
	let clipY1 = Math.max(gamut[0].y, gamut[1].y, gamut[2].y);

	ctx.clearRect(0, 0, 1, 1);

	ctx.lineWidth = 0.003;
	ctx.strokeStyle = "rgba(0, 0, 0, 0.25";
	ctx.beginPath();


	let waveMin = 4370;
	let waveMax = 6440;
	let curveResolution = 1000;

	ctx.moveTo(gamut[0].x, gamut[0].y);
	ctx.lineTo(gamut[1].x, gamut[1].y);
	ctx.lineTo(gamut[2].x, gamut[2].y);
	ctx.lineTo(gamut[0].x, gamut[0].y);

	ctx.save();
	ctx.clip();

	for (let i = 0; i < colorResolution; ++i) {
		let x0 = i / colorResolution;
		let x1 = (i + 1) / colorResolution;
		let xc = (x0 + x1) / 2;

		if (x1 < clipX0 || x0 > clipX1) {
			continue;
		}

		for (let j = 0; j < colorResolution; ++j) {
			let y0 = j / colorResolution;
			let y1 = (j + 1) / colorResolution;
			let yc = (y0 + y1) / 2;

			if (y1 < clipY0 || y0 > clipY1) {
				continue;
			}
			ctx.fillStyle = toCssColor(xyToRgb(xc, yc, 1));
			ctx.fillRect(x0, y0, y1 - y0, y1 - y0);
		}
	}

	ctx.restore();
	ctx.stroke();

	ctx.lineWidth = 0.002;
	ctx.strokeStyle = "rgba(0,0,0,0.05)";
	ctx.beginPath();

	for (let i = 0; i <= gridResolution; ++i) {
		let t = i / gridResolution;
		ctx.moveTo(0, t);
		ctx.lineTo(1, t);
		ctx.moveTo(t, 0);
		ctx.lineTo(t, 1);
	}
	ctx.stroke();
}

function drawCieColor() {
	let xy = app.control.xy;

	if (xy == null && app.hueResponse) {
		let lights = app.hueResponse.lights;
		if (lights && lights[app.hueLightId]) {
			xy = lights[app.hueLightId].state.xy;
		}
	}

	if (xy == null) {
		return;
	}

	let ctx = getCanvasContext();
	ctx.beginPath();
	ctx.lineWidth = 0.002;
	ctx.strokeStyle = "rgba(0,0,0,0.5)";
	ctx.arc(xy[0], xy[1], 0.01, 0, 2 * Math.PI);
	ctx.stroke();

	ctx.beginPath();

	ctx.fillStyle = toCssColor(xyToRgb(xy[0], xy[1], 1));
	ctx.arc(0.75, 0.05, 0.03, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.fill();
}

function showInfo() {
	let info = getInfoArea();
	let light = app.hueResponse.lights[app.hueLightId];

	if (!light) {
		info.value = "";
		return;
	}

	let state = light.state;

	info.value = [
		"name : " + light.name,
		"",
		"xy   : [" + state.xy[0].toFixed(4) + ", " + state.xy[1].toFixed(4) + "]",
		"bri  : " + state.bri,
	].join("\n");
}

function onChangeBrightness(value) {
	app.control.bri = Number(value);
	invalidateHue();
}

function onChangeXY(value) {
	let clampedValue = clampToGamut(value);

	app.control.xy = clampedValue;
	invalidate();
	invalidateHue();
}

function onFinishXY() {
	invalidate();
}

function invalidate() {
	app.isInvalid = true;
}

function invalidateHue() {
	app.isHueInvalid = true;
}

function validateSlider() {
	let slider = getBriSlider();
	let value = null;

	if (app.control.bri != null) {
		value = app.control.bri;
	} else if (app.hueResponse.lights[app.hueLightId]) {
		value = app.hueResponse.lights[app.hueLightId].state.bri;
	}

	if (value != null) {
		slider.value = value;
		slider.disabled = false;
	} else {
		slider.disabled = true;
	}
}

function validateButtons() {
	if (!app.isHueReady) {
		return;
	}

	let name = getNameButton();
	let light = getLightSwitch();

	name.disabled = false;
	light.disabled = false;

	let lightId = app.lightIds[app.lightIndex];
	if (lightId != null) {
		name.value = app.hueResponse.lights[lightId].name;
		light.checked = app.hueResponse.lights[lightId].state.on;
	} else {
		name.value = "";
	}

}

function validateColor() {
	drawCieDiagram();
	drawCieColor();
}

function update() {
	if (app.isInvalid) {
		validateSlider();
		validateButtons();
		validateColor();
		showInfo();

		app.isInvalid = false;
	}

	window.requestAnimationFrame(update);
}

function updateResponse(item) {
	if (!item) {
		return;
	}

	for (let key in item) {
		let value = item[key];
		let bits = key.split("/").splice(1);
		let route = app.hueResponse;
		let lastKey = bits[bits.length - 1];

		for (let i = 0; i < bits.length - 1; ++i) {
			route = route[bits[i]];
		}

		route[lastKey] = value;
	}
}

function updateHue() {
	if (!app.isHueReady) {
		return;
	}

	if (app.isHueInvalid) {
		let state = {};
		let lightId = app.hueLightId;

		if (app.control.xy != null) {
			state.xy = app.control.xy;
			app.hueResponse.lights[lightId].state.xy = state.xy;
			app.control.xy = null;
		}

		if (app.control.bri != null) {
			state.bri = app.control.bri;
			app.hueResponse.lights[lightId].state.bri = state.bri;
			app.control.bri = null;
		}

		if (app.control.on != null) {
			state.on = app.control.on;
			app.hueResponse.lights[lightId].state.on = state.on;
			app.control.on = null;
		}

		app.isHueInvalid = false;

		putLightState(lightId, state, function(httpCode, response) {
			if (response == null) {
				return;
			}

			for (let i = 0; i < response.length; ++i) {
				let item = response[i];
				updateResponse(item.success);
			}
			invalidate();
		});
	}
}

function resetHue() {
	let slider = getBriSlider();

	app.isHueReady = false;
	app.xy = null;
	app.brightness = null;

	invalidate();
}

function queryHue() {
	if (app.isHuePending) {
		return;
	}

	let lightId = app.hueLightId;

	app.isHuePending = true;
	getLight(lightId, function(httpCode, response) {
		app.isHuePending = false;
		app.hueResponse.lights[lightId] = response;

		if (httpCode == 200 && response != null) {
			let state = response.state;

			app.isHueReady = true;
			app.xy = {x: state.xy[0], y: state.xy[1]};
			app.brightness = state.bri;
		}

		invalidate();
	});
}

function connectHue() {
	getLights(function(httpCode, response) {
		if (httpCode == 200 && response != null) {
			app.isHueReady = true;
			app.hueResponse.lights = response;

			for (let lightId in app.hueResponse.lights) {
				app.lightIds.push(lightId);
			}

			setLightIndex(0);
		}

		invalidate();
	});
}

function setLightIndex(index) {
	app.lightIndex = index;
	app.hueLightId = app.lightIds[index];
	invalidate();
}

function selectPrevLight() {
	if (app.lightIds.length == 0) {
		return;
	}

	let count = app.lightIds.length;
	setLightIndex((app.lightIndex - 1 + count) % count);
}

function selectNextLight() {
	if (app.lightIds.length == 0) {
		return;
	}

	let count = app.lightIds.length;
	setLightIndex((app.lightIndex + 1) % count);
}

function enableLight(enable) {
	app.control.on = enable;
	invalidateHue();
}


// main ////////////////////////////////////////////////////////////////////////

var config = config || {};
var app = {
	canvas: {
		width: 500,
		height: 500,
		scale: 1000,
		minX: 0,
		minY: 0,
		maxX: 0.8,
		maxY: 0.8,
	},
	gamut: [
		{x: 0.6915, y: 0.3083},
		{x: 0.17, y: 0.7},
		{x: 0.1532, y: 0.0475},
	],
	control: {
		xy: null,
		bri: null,
		on: null,
	},

	brightness: null,
	isInvalid: true,

	hueLightId: null,
	hueResponse: {
		lights: []
	},

	lightIds: [],
	lightIndex: null,

	isHueInvalid: false,
	isHueReady: false,
	isHuePending: false,
	hueUpdateInterval: 500,
	enableHue: true,
};

function main() {
	initUI();
	initCanvasContext();
	connectHue();

	window.requestAnimationFrame(update);
	window.setInterval(updateHue, app.hueUpdateInterval);
}
