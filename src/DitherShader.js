const DitherShader = {
  uniforms: {
    tDiffuse: { value: null },
  },

  vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec4 vColor;

      attribute vec4 color;

      void main()
      {
      	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

      	vUv = uv;
        vColor = color;
      	gl_Position = projectionMatrix * mvPosition;
      }`,

  fragmentShader: /* glsl */ `
    precision mediump float;

    uniform sampler2D tDiffuse;

    varying vec2 vUv;
    varying vec4 vColor;

    float Epsilon = 1e-10;

    vec3 HUEtoRGB(float H) {
        float R = abs(H * 6.0 - 3.0) - 1.0;
        float G = 2.0 - abs(H * 6.0 - 2.0);
        float B = 2.0 - abs(H * 6.0 - 4.0);
        return clamp(vec3(R,G,B), 0.0, 1.0);
      }

    vec3 RGBtoHCV(vec3 RGB) {
        // Based on work by Sam Hocevar and Emil Persson
        vec4 P = (RGB.g < RGB.b) ? vec4(RGB.bg, -1.0, 2.0/3.0) : vec4(RGB.gb, 0.0, -1.0/3.0);
        vec4 Q = (RGB.r < P.x) ? vec4(P.xyw, RGB.r) : vec4(RGB.r, P.yzx);
        float C = Q.x - min(Q.w, Q.y);
        float H = abs((Q.w - Q.y) / (6.0 * C + Epsilon) + Q.z);
        return vec3(H, C, Q.x);
    }

    vec3 rgbToHsl(vec3 RGB) {
        vec3 HCV = RGBtoHCV(RGB);
        float L = HCV.z - HCV.y * 0.5;
        float S = HCV.y / (1.0 - abs(L * 2.0 - 1.0) + Epsilon);
        return vec3(HCV.x, S, L);
    }

    vec3 hslToRgb(vec3 HSL) {
        vec3 RGB = HUEtoRGB(HSL.x);
        float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
        return (RGB - 0.5) * C + HSL.z;
    }

    const float indexMatrix8x8[64] = float[](0.0,  32.0, 8.0,  40.0, 2.0,  34.0, 10.0, 42.0,
                                    48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
                                    12.0, 44.0, 4.0,  36.0, 14.0, 46.0, 6.0,  38.0,
                                    60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
                                    3.0,  35.0, 11.0, 43.0, 1.0,  33.0, 9.0,  41.0,
                                    51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
                                    15.0, 47.0, 7.0,  39.0, 13.0, 45.0, 5.0,  37.0,
                                    63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0);
    float indexValue() {
        int x = int(mod(gl_FragCoord.x, 8.0));
        int y = int(mod(gl_FragCoord.y, 8.0));
        return indexMatrix8x8[(x + y * 8)] / 64.0;
    }

    float hueDistance(float h1, float h2) {
          float diff = abs((h1 - h2));
          return min(abs((1.0 - diff)), diff);
    }

    const float lightnessSteps = 4.0;
    const int paletteSize = 1;
    const vec3 palette[1] = vec3[](vec3(0.49, 0.20, 0.61));

    float lightnessStep(float l) {
        return floor((0.5 + l * lightnessSteps)) / lightnessSteps;
    }

    vec3[2] closestColors(float hue) {
        vec3 ret[2];
        vec3 closest = vec3(-2, 0, 0);
        vec3 secondClosest = vec3(-2, 0, 0);
        vec3 temp;

        for (int i = 0; i < paletteSize; ++i) {
            temp = palette[i];
            float tempDistance = hueDistance(temp.x, hue);
            if (tempDistance < hueDistance(closest.x, hue)) {
                secondClosest = closest;
                closest = temp;
            } else {
                if (tempDistance < hueDistance(secondClosest.x, hue)) {
                    secondClosest = temp;
                }
            }
        }
        
        ret[0] = closest;
        ret[1] = secondClosest;
        return ret;
    }

    vec3 dither(vec3 color) {
        vec3 hsl = rgbToHsl(color);
        vec3 cs[2] = closestColors(hsl.x);
        vec3 c1 = cs[0];
        vec3 c2 = cs[1];
        float d = indexValue();
        float hueDiff = hueDistance(hsl.x, c1.x) / hueDistance(c2.x, c1.x);
        float l1 = lightnessStep(max((hsl.z - 0.125), 0.0));
        float l2 = lightnessStep(min((hsl.z + 0.124), 1.0));
        float lightnessDiff = (hsl.z - l1) / (l2 - l1);
        vec3 resultColor = (hueDiff < d) ? c1 : c2;
        resultColor.z = (lightnessDiff < d) ? l1 : l2;
        return hslToRgb(resultColor);
    }

    void main() {
        vec4 color = texture2D(tDiffuse, vUv);

        gl_FragColor = vec4(dither(color.rgb), 1.0);
	}`,
};

export { DitherShader };
