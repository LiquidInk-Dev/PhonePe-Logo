attribute vec3 aPhonePeScatteredOffset;
attribute vec3 aDiskScatteredOffset;
attribute vec3 aDiskAlignedOffset;

attribute vec3 aColor;
attribute float aTexIndex;
attribute float aRandom;

uniform float uTime;
uniform vec2 uResolution;

uniform float uAlignedToRand;
uniform float uRandToPhonePe;
uniform float uBaseScale;

uniform float uDistInMin;
uniform float uDistInMax;
uniform float uDistOutMin;
uniform float uDistOutMax;

varying vec2 vUv;
varying vec3 vColor;
varying float vTexIndex;
varying float vRandom;

float remapClamped(float value, float min1, float max1, float min2,
                   float max2) {
  float t = clamp((value - min1) / (max1 - min1), 0.0, 1.0);
  return mix(min2, max2, t);
}

void main() {
  // Plane faces +z by default
  vec3 local = vec3(position.x, 0.0, -position.y);

  // Example animation: each instance pulses at its own phase
  float phase = aRandom * 6.2831;
  local *= uBaseScale;

  // vec3 offset = aDiskAlignedOffset;
  vec3 offset = mix(aDiskAlignedOffset, aDiskScatteredOffset, uAlignedToRand);
  offset = mix(offset, aPhonePeScatteredOffset, uRandToPhonePe);

  float distFactor = remapClamped(length(offset), uDistInMin, uDistInMax,
                                  uDistOutMin, uDistOutMax);
  local *= distFactor;

  // offset.y += sin(uTime + phase) * 0.05;

  vec4 modelPosition = modelMatrix * vec4(offset + local, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  vUv = uv;
  vColor = aColor;
  vTexIndex = aTexIndex;
  vRandom = aRandom;
}
