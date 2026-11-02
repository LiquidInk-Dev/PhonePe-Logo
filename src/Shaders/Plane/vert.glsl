attribute vec3 aPhonePeScatteredOffset;
attribute vec3 aDiskScatteredOffset;
attribute vec3 aDiskAlignedOffset;

attribute vec3 aColor;
attribute vec3 aBaseColor;
attribute float aTexIndex;
attribute float aRandom;

uniform float uTime;
uniform vec3 uMouse;

uniform float uAlignedToRand;
uniform float uRandToPhonePe;
uniform float uBaseScale;

uniform float uDistInMin;
uniform float uDistInMax;
uniform float uDistOutMin;
uniform float uDistOutMax;

uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;

varying vec2 vUv;
varying vec3 vColor;
varying vec3 vBaseColor;
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

  vec3 offset = mix(aDiskAlignedOffset, aDiskScatteredOffset, uAlignedToRand);
  offset = mix(offset, aPhonePeScatteredOffset, uRandToPhonePe);

  float distFactor = remapClamped(length(offset), uDistInMin, uDistInMax,
                                  uDistOutMin, uDistOutMax);
  local *= distFactor;
  // offset.y += sin(uTime + phase) * 0.01;
  vec3 finalPosition = vec3(offset + local);

  vec3 mouseInfluenceDirection = (offset - vec3(uMouse.x, 0.0, uMouse.z));
  float dist = length(mouseInfluenceDirection);
  float mouseInfluenceAmplitude = 1. - smoothstep(0.0, uMouseRadius, dist);
  vec3 push = normalize(mouseInfluenceDirection + 1e-4) *
              mouseInfluenceAmplitude * uMouseStrength * uMouseActive;

  vec4 modelPosition = modelMatrix * vec4(finalPosition + push, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  vUv = uv;
  vColor = aColor;
  vBaseColor = aBaseColor;
  vTexIndex = aTexIndex;
  vRandom = aRandom;
}
