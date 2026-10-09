import * as THREE from 'three';

/**
 * One camera-following layer of snowflakes. Flakes live in a box that wraps
 * around the camera, so the field is endless with a fixed particle count.
 */
function layer(count: number, box: THREE.Vector3, atlas: THREE.Texture, near: boolean) {
  const base = new Float32Array(count * 3);
  const a1 = new Float32Array(count * 4); // size(m), fall speed, cell, seed
  for (let i = 0; i < count; i++) {
    base.set([Math.random() * box.x, Math.random() * box.y, Math.random() * box.z], i * 3);
    // skew toward small flakes: real size 9–59 mm
    const s = 0.009 + Math.pow(Math.random(), 2.2) * 0.05;
    a1.set([s, 0.5 + Math.random() * 0.5, Math.floor(Math.random() * 8), Math.random()], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('aData', new THREE.BufferAttribute(a1, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

  const uniforms = {
    uTime: { value: 0 },
    uBox: { value: box.clone() },
    uCam: { value: new THREE.Vector3() },
    uScale: { value: 800 },
    uWind: { value: new THREE.Vector2(0.35, 0.12) },
    uMap: { value: atlas },
    uAmt: { value: 1 },
    uMaxPx: { value: 140 },
    uDay: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      uniform float uTime, uScale, uAmt, uMaxPx;
      uniform vec3 uBox, uCam;
      uniform vec2 uWind;
      varying float vCell, vSpin, vTumble, vAlpha, vBias, vDot, vGlint;
      void main(){
        float size = aData.x, speed = aData.y, seed = aData.w;
        float t = uTime;
        vec3 p = position;
        p.y -= speed * t;
        p.x += uWind.x * t + .35*sin(t*(.6 + seed*.7) + seed*40.) + .08*sin(t*(2.3 + seed*2.) + seed*9.);
        p.z += uWind.y * t + .3*cos(t*(.5 + seed*.6) + seed*23.) + .07*cos(t*(2.7 + seed) + seed*5.);
        // wrap into a box centred on the camera
        vec3 rel = mod(p - uCam + uBox*.5, uBox) - uBox*.5;
        vec3 w = uCam + rel;
        vec3 e = abs(rel) / (uBox*.5);
        float edge = 1. - smoothstep(.75, 1., max(max(e.x, e.y), e.z));
        float water = smoothstep(.0, .35, w.y);
        vec4 mv = viewMatrix * vec4(w, 1.);
        float dist = -mv.z;
        gl_Position = projectionMatrix * mv;
        float px = size * uScale / max(dist, .05);
        vDot = smoothstep(4., 2., px);              // tiny far flakes → soft dots
        float shown = step(seed, uAmt);
        vAlpha = edge * water * shown * smoothstep(.25, .7, dist) ${near ? '' : '* (1. - smoothstep(18., 26., dist))'};
        gl_PointSize = clamp(px, 1.5, uMaxPx);
        vCell = aData.z;
        vSpin = t * (seed - .5) * 2.4 + seed * 6.28;
        vTumble = abs(cos(t * (.4 + seed*.9) + seed*12.));
        vBias = clamp((1.2 - dist) * 3., 0., 3.5);   // close flakes are out of focus
        vGlint = pow(max(0., sin(t*(1.7 + seed*3.) + seed*80.)), 60.) * step(.93, fract(seed*13.7));
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uDay;
      varying float vCell, vSpin, vTumble, vAlpha, vBias, vDot, vGlint;
      void main(){
        if(vAlpha < .01) discard;
        vec2 p = gl_PointCoord - .5;
        float c = cos(vSpin), s = sin(vSpin);
        p = mat2(c, -s, s, c) * p;
        p.y /= max(vTumble, .22);                     // foreshortening while tumbling
        if(abs(p.x) > .5 || abs(p.y) > .5) discard;
        float col = mod(vCell, 4.), row = floor(vCell / 4.);
        vec2 uv = vec2((col + p.x + .5) / 4., 1. - (row + p.y + .5) / 2.);
        vec4 tex = texture2D(uMap, uv, vBias);
        float a = mix(tex.a, exp(-dot(p,p)*14.) * .9, vDot);
        a *= vAlpha * (1. - vBias*.12);
        if(a < .01) discard;
        vec3 tint = mix(vec3(.82,.9,1.), vec3(1.), uDay);
        gl_FragColor = vec4(tint * (1. + vGlint*3.), a * (.85 + vGlint));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = near ? 20 : 10;
  return { points, uniforms, geo, mat };
}

export function createSnow(atlas: THREE.Texture, farCount: number, nearCount: number) {
  const far = layer(farCount, new THREE.Vector3(48, 20, 48), atlas, false);
  const near = layer(nearCount, new THREE.Vector3(8, 8, 8), atlas, true);
  const group = new THREE.Group();
  group.add(far.points, near.points);
  return {
    group,
    update(t: number, cam: THREE.Vector3, scale: number, amount: number, day: number, maxPx: number) {
      for (const l of [far, near]) {
        l.uniforms.uTime.value = t;
        l.uniforms.uCam.value.copy(cam);
        l.uniforms.uScale.value = scale;
        l.uniforms.uAmt.value = amount;
        l.uniforms.uDay.value = day;
        l.uniforms.uMaxPx.value = maxPx;
      }
    },
    setCounts(farN: number, nearN: number) {
      far.geo.setDrawRange(0, farN);
      near.geo.setDrawRange(0, nearN);
    },
    dispose() {
      far.geo.dispose();
      far.mat.dispose();
      near.geo.dispose();
      near.mat.dispose();
    },
  };
}
