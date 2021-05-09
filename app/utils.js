

function clamp(value, minValue, maxValue) {
	if (value < minValue) {
		return minValue;
	} else if (value > maxValue) {
		return maxValue;
	}
	return value;
}

function lnormal(v) {
	return {x: -v.y, y: v.x};
}

function rnormal(v) {
	return {x: v.y, y: -v.x};
}

function gaussian(x, alpha, mu, sigma1, sigma2) {
	let t = (x - mu) / (x < mu ? sigma1 : sigma2);
	let g = alpha * Math.exp(-(t * t) / 2);
	return g;
}

function wavelengthToChromaticity(lambda) {
	let X = (
		gaussian(lambda,  1.056, 5998, 379, 310) +
		gaussian(lambda,  0.362, 4420, 160, 267) +
		gaussian(lambda, -0.065, 5011, 204, 262));
	let Y = (
		gaussian(lambda,  0.821, 5688, 469, 405) +
		gaussian(lambda,  0.286, 5309, 163, 311));
	let Z = (
		gaussian(lambda,  1.217, 4370, 118, 360) +
		gaussian(lambda,  0.681, 4590, 260, 138));

	let chromaticity = {
		x: X / (X + Y + Z),
		y: Y / (X + Y + Z)
	};

	return chromaticity;
}

function xyToRgb(x, y, Y) {
	// CIE xy -> rgb | https://gist.github.com/popcorn245/30afa0f98eea1c2fd34d

	let z = 1 - x - y;
	let X = (Y / y) * x;
	let Z = (Y / y) * z;

	let M0 = [
		// Hue
		[1.4628067, -0.1840623, -0.2743606],
		[-0.5217933, 1.4472381, 0.0677227],
		[0.0349342, -0.0968930, 1.2884099],
	];

	let M1 = [
		// CIE RGB
		[2.3706743, -0.9000405, -0.4706338],
		[-0.5138850,  1.4253036,  0.0885814],
		[ 0.0052982, -0.0146949,  1.0093968],
	];

	let M2 = [
		// sRGB D50
		[ 3.1338561, -1.6168667, -0.4906146],
		[-0.9787684,  1.9161415,  0.0334540],
		[ 0.0719453, -0.2289914,  1.4052427],
	];

	let M2b = [
		[ 3.2404542, -1.5371385, -0.4985314],
		[-0.9692660,  1.8760108,  0.0415560],
		[ 0.0556434, -0.2040259,  1.0572252],
	];

	let M3 = [
		// stackOverflow
		[ 1.612, -0.203, -0.302],
		[-0.509,  1.412, 0.066],
		[ 0.026, -0.072, 0.962],
	];

	let M4 = [
		// Ben Knight
		// https://github.com/benknight/hue-python-rgb-converter/blob/master/rgbxy/__init__.py
		[ 1.656492, -0.354851, -0.255038],
		[-0.707196,  1.655397, 0.036152],
		[ 0.051713, -0.121364, 1.011530],
	];

	let M = M2b;

	let r = X * M[0][0] + Y * M[0][1] + Z * M[0][2];
	let g = X * M[1][0] + Y * M[1][1] + Z * M[1][2];
	let b = X * M[2][0] + Y * M[2][1] + Z * M[2][2];

	r = (r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055);
	g = (g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055);
	b = (b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055);

	let maxValue = Math.max(r, g, b);
	let mul = maxValue > 1 ? 1 / maxValue : 1;

	return {
		r: r * mul,
		g: g * mul,
		b: b * mul,
	};
}

function toCssColor(color) {
	return "rgb(" + [
		Math.round(255 * color.r).toString(),
		Math.round(255 * color.g).toString(),
		Math.round(255 * color.b).toString()
	].join(", ") + ")";
}

function cross(v1, v2) {
	return v1.x * v2.y - v1.y * v2.x;
}

function vectorTo(a, b) {
	return {x: b.x - a.x, y: b.y - a.y};
}

function vectorSum(a, b) {
	return {x: a.x + b.x, y: a.y + b.y};
}

function intersect(u0, u1, v0, v1) {
	// p * u1 + (1 - p) * u0 == q * v1 + (1 - q) * v0
	// p * (u1 - u0) + u0 == q * (v1 - v0) + v0
	// p * (u1 - u0) == q * (v1 - v0) + v0 - u0
	//
	// p == (q * (v1 - v0) + (v0 - u0)) / (u1 - u0)
	// p == (q * dv + dvu) / du
	// q == (p * du - dvu) / dv

	let du = {x: u1.x - u0.x, y: u1.y - u0.y};
	let dv = {x: v1.x - v0.x, y: v1.y - v0.y};
	let dvu = {x: v0.x - u0.x, y: v0.y - u0.y};

	if (dv.x == 0) {
		if (du.x == 0) {
			return 0;
		} else {
			return dvu.x / du.x;
		}
	} else {
		// p  == (dvux * dvyx - dvuy) / (dux * dvyx - duy)
		let dvyx = dv.y / dv.x;
		let denom = du.x * dvyx - du.y;
		let num = dvu.x * dvyx - dvu.y;

		if (denom == 0) {
			return 0;
		}
		return num / denom;
	}
}

function lerp(lambda, minValue, maxValue) {
	return lambda * maxValue + (1 - lambda) * minValue;
}

function vectorLerp(lambda, v0, v1) {
	return {
		x: lambda * v1.x + (1 - lambda) * v0.x,
		y: lambda * v1.y + (1 - lambda) * v0.y
	};
}

function vectorLength2(v) {
	return v.x * v.x + v.y * v.y
}

function getLight(lightId, callback) {
	let xhr = new XMLHttpRequest();
	let baseUrl = "http://" + config.address;
	let endpoint = "/api/" + config.username + "/lights/" + lightId;

	console.log("GET", endpoint);

	xhr.open("GET", baseUrl + endpoint);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			let response = null;
			if (xhr.status == 200) {
				response = JSON.parse(xhr.responseText);
			}
			callback(xhr.status, response);
		}
	}
	xhr.send();
}

function getLights(callback) {
	let xhr = new XMLHttpRequest();
	let baseUrl = "http://" + config.address;
	let endpoint = "/api/" + config.username + "/lights";

	console.log("GET", endpoint);

	xhr.open("GET", baseUrl + endpoint);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			let response = null;
			if (xhr.status == 200) {
				response = JSON.parse(xhr.responseText);
			}
			callback(xhr.status, response);
		}
	}
	xhr.send();
}

function putLightState(lightId, state, callback) {
	let xhr = new XMLHttpRequest();
	let baseUrl = "http://" + config.address;
	let endpoint = "/api/" + config.username + "/lights/" + lightId + "/state";

	console.log("PUT", endpoint);

	xhr.open("PUT", baseUrl + endpoint);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			let response = null;
			if (xhr.status == 200) {
				response = JSON.parse(xhr.responseText);
			}

			if (callback != null) {
				callback(xhr.status, response);
			}
		}
	}

	xhr.send(JSON.stringify(state));
}

function isInsideGamut(pos) {
	let v1 = vectorTo(app.gamut[0], app.gamut[1]);
	let v2 = vectorTo(app.gamut[1], app.gamut[2]);
	let v3 = vectorTo(app.gamut[2], app.gamut[0]);

	let p1 = vectorTo(app.gamut[0], pos);
	let p2 = vectorTo(app.gamut[1], pos);
	let p3 = vectorTo(app.gamut[2], pos);

	let c1 = cross(v1, p1);
	let c2 = cross(v2, p2);
	let c3 = cross(v3, p3);

	return (c1 >=0 && c2 >= 0 && c3 >= 0);
}

function closestToGamut(pos) {
	let g0 = app.gamut[0];
	let g1 = app.gamut[1];
	let g2 = app.gamut[2];

	let n0 = vectorSum(pos, lnormal(vectorTo(g0, g1)));
	let n1 = vectorSum(pos, lnormal(vectorTo(g1, g2)));
	let n2 = vectorSum(pos, lnormal(vectorTo(g2, g0)));

	let i0 = clamp(intersect(g0, g1, pos, n0), 0, 1);
	let i1 = clamp(intersect(g1, g2, pos, n1), 0, 1);
	let i2 = clamp(intersect(g2, g0, pos, n2), 0, 1);

	let p0 = vectorLerp(i0, g0, g1);
	let p1 = vectorLerp(i1, g1, g2);
	let p2 = vectorLerp(i2, g2, g0);

	let l0 = vectorLength2(vectorTo(p0, pos));
	let l1 = vectorLength2(vectorTo(p1, pos));
	let l2 = vectorLength2(vectorTo(p2, pos));

	let arr = [
		[l0, p0],
		[l1, p1],
		[l2, p2]
	];

	arr.sort(function(a, b) {
		return a[0] - b[0];
	});

	return arr[0][1];
}

function clampToGamut(value) {
	let pos = {x: value[0], y: value[1]};

	if (!isInsideGamut(pos)) {
		pos = closestToGamut(pos);
		return [pos.x, pos.y];
	}

	return value;
}
