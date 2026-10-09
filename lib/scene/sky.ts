import * as THREE from 'three';
import { NOISE, SKY_FN } from './glsl';

const DEG = Math.PI / 180;

/** Equatorial unit vector (x toward RA 0h, z toward north celestial pole). */
export function eqVec(raHours: number, decDeg: number) {
  const a = raHours * 15 * DEG, d = decDeg * DEG;
  return new THREE.Vector3(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d));
}

// Celestial pole placement in view space: ~0.38 rad right of forward, ~0.1 rad up.
const POLE_AZ = 0.38;
const POLE_EL = 0.1;
export const POLE = new THREE.Vector3(Math.cos(POLE_EL) * Math.sin(POLE_AZ), Math.sin(POLE_EL), -Math.cos(POLE_EL) * Math.cos(POLE_AZ)).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const E1 = UP.clone().sub(POLE.clone().multiplyScalar(UP.dot(POLE))).normalize(); // hour angle 0 (upper meridian)
const WEST = new THREE.Vector3().crossVectors(E1, POLE).normalize();

export const NGP_EQ = eqVec(12 + 51.4 / 60, 27.13);
export const GC_EQ = eqVec(17 + 45.6 / 60, -28.94);

/** Rotation taking equatorial coordinates to world directions at local sidereal time θ (radians). */
export function skyMatrix(theta: number, out = new THREE.Matrix4()) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const c0 = E1.clone().multiplyScalar(c).addScaledVector(WEST, s);
  const c1 = E1.clone().multiplyScalar(s).addScaledVector(WEST, -c);
  out.makeBasis(c0, c1, POLE);
  return out;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position,1.0)).xyz, 1.0);
  gl_Position = p.xyww;
}`;

const SHOOTING = /* glsl */ `
float segDist(vec2 p, vec2 a, vec2 b, out float h){
  vec2 pa = p-a, ba = b-a;
  h = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.);
  return length(pa - ba*h);
}
vec3 shootingStars(vec3 d){
  vec3 col = vec3(0.);
  float alt = asin(clamp(d.y,-1.,1.));
  float az = atan(d.x, -d.z);
  vec2 p = vec2(az*cos(alt), alt);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float period = 9. + fi*5.3;
    float t = uTime + fi*3.7;
    float cyc = floor(t/period);
    float lt = mod(t, period);
    float dur = .9;
    if(lt > dur) continue;
    float r1 = hash12(vec2(cyc, fi)), r2 = hash12(vec2(fi, cyc+3.1)), r3 = hash12(vec2(cyc*1.7, fi+9.));
    vec2 a = vec2(-.7 + 1.4*r1, .3 + .45*r2);
    vec2 dir = normalize(vec2(r3 > .5 ? 1. : -1., -.55 - .4*r1));
    float k = lt/dur;
    vec2 head = a + dir*.35*k;
    vec2 tail = head - dir*.12*(1.-k*.4);
    float h;
    float dist = segDist(p, tail, head, h);
    float w = .0016;
    float v = exp(-dist*dist/(w*w)) * h*h * sin(3.14159*k);
    col += vec3(.85,.95,1.) * v * 1.6;
  }
  return col;
}`;

export function createSky(octaves: number) {
  const uniforms = {
    uTime: { value: 0 },
    uAur: { value: 1.3 },
    uDay: { value: 0 },
    uNGP: { value: new THREE.Vector3() },
    uGC: { value: new THREE.Vector3() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: /* glsl */ `
      #define FBM_OCT ${octaves}
      varying vec3 vDir;
      ${NOISE}
      ${SKY_FN}
      ${SHOOTING}
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = skyColor(d);
        c += shootingStars(d) * (1. - uDay) * smoothstep(.05,.2,d.y);
        // fog band toward horizon so the ocean blends in
        c = mix(c, vec3(.024,.067,.125) + aurora(vec3(d.x, .06, d.z))*.08, (1.-smoothstep(-.02,.09,d.y))*(1.-uDay));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/**
 * Low-res equirect render of the sky (horizon → 0.9 rad) used for ocean reflections.
 * Rendered every few frames — reflections are distorted by ripples so it never shows.
 */
export function createReflectionRT(w: number, h: number, uniforms: ReturnType<typeof createSky>['uniforms']) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  rt.texture.wrapS = THREE.RepeatWrapping;
  rt.texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */ `
      #define FBM_OCT 3
      varying vec2 vUv;
      ${NOISE}
      ${SKY_FN}
      void main(){
        float az = (vUv.x - .5) * 6.2831853;
        float alt = vUv.y * .9;
        vec3 d = vec3(cos(alt)*sin(az), sin(alt), -cos(alt)*cos(az));
        gl_FragColor = vec4(skyColor(d), 1.);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    rt,
    scene,
    camera: cam,
    render(renderer: THREE.WebGLRenderer) {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
    },
    dispose() {
      rt.dispose();
      mat.dispose();
      quad.geometry.dispose();
    },
  };
}
