// //　方法一:使用转换公式
// R = Y + 1.402 (Cr-128)
// G = Y - 0.34414 (Cb-128) - 0.71414 (Cr-128)
// B = Y + 1.772 (Cb-128)

// // 方法二:　使用转换矩阵
// (1.0,　1.0,  1.0,
// 0.0, -0.39465, 2.03211,
// 1.13983, -0.58060, 0.0)

#define PIX_FMT 0

precision mediump float;

uniform sampler2D samplerY;
#if PIX_FMT == 0
uniform sampler2D samplerU;
uniform sampler2D samplerV;
#else
uniform sampler2D samplerUV;
#endif

const mat4 YUV2RGB = mat4(
    1.1643828125,             0, 1.59602734375, -.87078515625,
    1.1643828125, -.39176171875,    -.81296875,     .52959375,
    1.1643828125,   2.017234375,             0,  -1.081390625,
                0,             0,             0,             1
);

varying vec2 vUv;

void main() {

    vec3 yuv;

    yuv.x = texture2D(samplerY, vUv).x;


#if PIX_FMT == 0
    yuv.y = texture2D(samplerU, vUv).x;
    yuv.z = texture2D(samplerV, vUv).x;
#else
    yuv.y = texture2D(samplerUV, vUv).x;
    yuv.z = texture2D(samplerUV, vUv).w;
#endif


#ifndef GRAY_MODE
    gl_FragColor = vec4(yuv, 1.0) * YUV2RGB;
#else
    gl_FragColor = texture2D(samplerY, vUv);

#endif

}


