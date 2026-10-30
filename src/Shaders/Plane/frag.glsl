uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;

uniform float uTime;

varying vec2 vUv;
varying vec3 vColor;
varying float vTexIndex;
varying float vRandom;

void main() {
  vec4 t0 = texture2D(uTex0, vUv);
  vec4 t1 = texture2D(uTex1, vUv);
  vec4 t2 = texture2D(uTex2, vUv);

  float is1 = step(0.5, vTexIndex);
  float is2 = step(1.5, vTexIndex);
  vec4 tex = mix(mix(t0, t1, is1), t2, is2);

  if (tex.a < 0.9)
    discard;

  // Example color animation
  vec3 color =
      vColor * tex.rgb * (0.85 + 0.15 * sin(uTime * 3.0 + vRandom * 6.2831));

  gl_FragColor = vec4(color, tex.a);

#include <colorspace_fragment>
}
