// Shared GLSL chunks for the polar scene.

export const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float a = .5, s = 0.;
  for(int i=0;i<FBM_OCT;i++){ s += a*vnoise(p); p = p*2.03 + vec2(17.1, 9.2); a *= .5; }
  return s;
}
`;

/**
 * Sky colour as a function of a world-space direction. Used by the sky dome at
 * full quality and (with fewer octaves) by the low-res reflection texture.
 * Expects uniforms: uTime, uAur, uDay, uNGP, uGC.
 */
export const SKY_FN = /* glsl */ `
uniform float uTime;
uniform float uAur;
uniform float uDay;
uniform vec3 uNGP;
uniform vec3 uGC;

const vec3 AUR_G = vec3(.12, 1., .56);
const vec3 AUR_V = vec3(.6, .34, 1.);
const vec3 AUR_P = vec3(1., .38, .62);

vec3 skyGradient(vec3 d){
  float h = clamp(d.y, 0., 1.);
  vec3 night = mix(vec3(.025,.068,.125), vec3(.003,.01,.03), pow(h, .55));
  vec3 day = mix(vec3(.62,.78,.9), vec3(.22,.45,.75), pow(h, .6));
  return mix(night, day, uDay);
}

vec3 aurora(vec3 d){
  float alt = asin(clamp(d.y, -1., 1.));
  if(alt < -.02) return vec3(0.);
  float az = atan(d.x, -d.z);
  // keep noise seamless around the back of the dome
  vec2 ring = vec2(cos(az), sin(az));
  float t = uTime;
  vec3 col = vec3(0.);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float wob = fbm(ring*1.4 + vec2(fi*7.1 + t*.035, fi*3.3 - t*.02));
    float base = .07 + fi*.075 + .16*(wob-.5) + .05*sin(az*1.7 + fi + t*.05);
    float h = alt - base;
    if(h < -.04) continue;
    float height = .20 + .16*fbm(ring*2.1 + vec2(fi*3.1, t*.04));
    float edge = smoothstep(-.016, .012, h);
    float fade = exp(-max(h, 0.) / (height*.42));
    float rays = .45 + .55*fbm(vec2(az*26. + fi*13. + wob*5., t*.22 + fi));
    rays *= .65 + .35*vnoise(vec2(az*85. + t*.9, fi*5.));
    float mask = smoothstep(.32, .72, fbm(ring*1.1 + vec2(fi*2.3 - t*.018, fi*1.7 + t*.011)));
    float k = clamp(h/height, 0., 1.2);
    vec3 c = mix(AUR_G, AUR_V, smoothstep(.22, .78, k));
    c = mix(c, AUR_P, smoothstep(.78, 1.15, k));
    float lowGlow = exp(-abs(h)*38.)*.6;
    col += c * (edge*fade*rays + lowGlow*.2) * mask * (1. - fi*.22);
  }
  // diffuse green glow near the horizon under the curtains
  col += AUR_G * .025 * exp(-max(alt,0.)*9.) * (.6 + .4*fbm(ring*2. + t*.02));
  return col * uAur * (1. - uDay) * .3;
}

vec3 milkyWay(vec3 d){
  float b = asin(clamp(dot(d, uNGP), -1., 1.));
  vec3 gc2 = cross(uNGP, uGC);
  float l = atan(dot(d, gc2), dot(d, uGC));
  float band = exp(-b*b/(.022 + .02*cos(l)));
  if(band < .01) return vec3(0.);
  vec2 q = vec2(l*3.2, b*9.);
  float cloud = fbm(q + 4.3);
  float dust = smoothstep(.38, .72, fbm(q*1.9 + 11.)) * exp(-b*b/.004);
  float core = .55 + .45*cos(l);
  float v = band * (.35 + .9*cloud) * (1. - .85*dust) * (.4 + .9*core*core);
  return vec3(.62, .66, .78) * v * .085;
}

vec3 skyColor(vec3 d){
  vec3 c = skyGradient(d);
  float night = 1. - uDay;
  c += milkyWay(d) * night * smoothstep(-.02, .25, d.y);
  c += aurora(d);
  return c;
}
`;
