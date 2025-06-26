# [JavaScript + WebGL Chip-8 Emulator](https://leidnedya.github.io/chip8/)

I created this project to practice writing emulators and shaders! It runs in 
vanilla JavaScript, HTML, CSS, and WebGL. Check out the live demo 
[here](https://leidnedya.github.io/chip8/)!

Also, here are my shaders if you're into that sort of thing (yeah, I inlined them. sue me):
```javascript
const vertexShaderSource = `
attribute vec3 a_position;
uniform float u_pointSize;

varying vec4 clipPosition;

// from https://www.shadertoy.com/view/XtlSD7
vec2 CRTCurveUV(vec2 uv){
    uv = uv * 2.0;
    vec2 offset = abs( uv.yx ) / vec2( 6.0, 4.0 );
    uv = uv - uv * offset * offset * offset;
    uv = uv * 0.5;
    return uv;
}

void main() {
  float offset = a_position.z;
  gl_Position = vec4(
    (a_position.x / (${WIDTH}.0) - 0.5) * 2.0 + offset / 100.0,
    ((${HEIGHT}.0 - 1.0 - a_position.y) / ${HEIGHT}.0 - 0.5) * 2.0 + offset / 100.0,
    0.0, 1.0);
  gl_Position = vec4(CRTCurveUV(gl_Position.xy), gl_Position.z, gl_Position.w);
  gl_PointSize = u_pointSize;
  clipPosition = gl_Position;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec4 clipPosition;

float rand(vec2 co){
    return sin(dot(co, vec2(12.9898, 78.233))) / 8.0;
}

// from https://www.shadertoy.com/view/XtlSD7
vec2 CRTCurveUV(vec2 uv){
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs( uv.yx ) / vec2( 6.0, 4.0 );
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

void main() {

  vec2 uv = clipPosition.xy / vec2(${WIDTH}.0, ${HEIGHT}.0);

  float rand = rand(gl_PointCoord);
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  float alpha = smoothstep(0.5, 0.0, dist);
  float green = smoothstep(0.5, 0.0, rand);

  gl_FragColor = vec4((alpha + rand / 2.0) / rand, 0.5 * alpha, green, alpha);
}
`
```
