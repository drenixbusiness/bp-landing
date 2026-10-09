import * as THREE from 'three';
import { NOISE } from './glsl';

export function createOcean(reflection: THREE.Texture, octaves = 4) {
  const uniforms = {
    uTime: { value: 0 },
    uRefl: { value: reflection },
    uDay: { value: 0 },
    uFog: { value: new THREE.Color(0x061120) },
    uAur: { value: 1.3 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      #define FBM_OCT ${octaves}
      uniform float uTime, uDay, uAur;
      uniform sampler2D uRefl;
      uniform vec3 uFog;
      varying vec3 vW;
      ${NOISE}
      float hgt(vec2 p){
        float t = uTime;
        return fbm(p*.18 + vec2(t*.05, t*.03)) + .5*fbm(p*.55 - vec2(t*.07, -t*.04));
      }
      void main(){
        vec3 V = vW - cameraPosition;
        float dist = length(V);
        V /= dist;
        float e = .35;
        float h0 = hgt(vW.xz);
        float hx = hgt(vW.xz + vec2(e, 0.)), hz = hgt(vW.xz + vec2(0., e));
        float amp = .9 / (1. + dist*.02);
        vec3 n = normalize(vec3(-(hx-h0)/e*amp, 1., -(hz-h0)/e*amp));
        vec3 R = reflect(V, n);
        R.y = abs(R.y);
        float az = atan(R.x, -R.z);
        float alt = asin(clamp(R.y, 0., 1.));
        vec3 refl = texture2D(uRefl, vec2(az/6.2831853 + .5, clamp(alt/.9, .002, .998))).rgb;
        float cosi = max(dot(-V, n), 0.);
        float F = .02 + .98*pow(1. - cosi, 5.);
        vec3 deep = mix(vec3(.004,.016,.03), vec3(.05,.2,.3), uDay);
        vec3 col = mix(deep, refl*.8, clamp(F, 0., 1.));
        // subtle subsurface tint on wave crests
        col += vec3(.0,.035,.05) * smoothstep(.55, .95, h0) * (1. - uDay*.5);
        float fogK = 1. - exp(-pow(dist/520., 1.6));
        vec3 fogCol = mix(uFog, vec3(.66,.8,.9), uDay);
        col = mix(col, fogCol + refl*.12, fogK);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -5;
  return { mesh, uniforms };
}
