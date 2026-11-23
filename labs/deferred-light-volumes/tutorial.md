# Deferred light volumes: a walkthrough of the lab

Each step says what to look at in the lab. The thumbnails under the scene are numbered 1 to 8, and clicking one shows that stage full size.

## The one idea

Deferred shading splits rendering into two parts:

1. **Geometry pass:** draw the scene once and store, for every pixel, what the surface is: its color, its normal and its position. That set of images is the **G-buffer**.
2. **Lighting pass:** for each light, read the G-buffer and add that light's contribution.

The question this lab answers is the second part's cost. A small light only reaches a few pixels. If every light runs its shader on every pixel, most of that work produces zero. A **light volume** is the fix: draw a shape that encloses the light's reach, and run the lighting shader only where that shape is on screen.

## Step 1: Fill the G-buffer (thumbnails 1, 2 and 3)

The scene is drawn once into three textures plus the depth buffer:

```glsl
oAlbedo = vec4(color, 1.0);               // surface color
oNormal = vec4(normalize(vNorV), 1.0);    // normal, in view space
oPos    = vec4(vPosV, 1.0);               // position, in view space
```

No lighting happens here. The alpha of `oPos` is 1 where there is geometry and 0 on the empty background, which lets later passes skip the background.

*Try it:* click thumbnails **1**, **2** and **3** to see the albedo, the normals and the depth.

## Step 2: Add the lights, one at a time (thumbnail 7)

The lighting pass draws into a separate light buffer with additive blending, so each light adds on top of the others:

```js
gl.depthMask(false);                 // lights must not change the scene's depth
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE);        // result = what is there + this light
```

The shader for one light reads the G-buffer at its own pixel and does ordinary lighting math:

```glsl
vec4 P = texelFetch(uPos, p, 0);
if (P.a < 0.5) return;                       // background: nothing to light
vec3 L = uLightV - P.xyz; float d = length(L);
if (d >= uRadius) return;                    // out of this light's reach
// diffuse + specular, then fade to exactly zero at the radius
float x = d / uRadius, win = clamp(1.0 - x*x*x*x, 0.0, 1.0); win *= win;
float att = win / (1.0 + d * d);
oLight = vec4(uLightColor * (albedo + spec) * ndl * att * uIntensity, 0.0);
```

The `win` term matters: it forces the light to zero at `uRadius`. Without a hard limit, there would be no finite volume to draw.

The two early `return` lines are the wasted work. The shader ran, found nothing to do, and wrote zero. The rest of the lab is about not running it at all for those pixels.

## Step 3: Mode 1, a full-screen quad per light (the baseline)

Each light draws a quad that covers the whole screen. Every pixel runs every light's shader.

Cost = pixels × lights. With 64 lights, that is 64 full-screen passes.

*Try it:* set **View** to **Cost heatmap** and pick mode 1. The whole image is the same hot color. Read **Light shader runs** in the Measured list.

## Step 4: Mode 2, draw a sphere (front faces)

Draw the light as a sphere mesh with the light's radius. The rasterizer now only produces pixels inside the sphere's outline on screen, so the shader runs only there.

```glsl
vec3 w = uLightW + aPos * uRadius * 1.04;   // unit sphere, scaled and moved to the light
```

The 1.04 is there because the mesh is made of flat triangles. It has to be slightly larger so that it fully contains the true sphere.

This mode has a bug. Press **Put camera inside light #1** and the light disappears. From inside the sphere, the front faces are behind the camera, and the only faces you could see are back faces, which this mode culls.

## Step 5: Mode 3, draw the back faces

Cull the front faces and draw the back faces instead:

```js
gl.cullFace(gl.FRONT);
gl.disable(gl.DEPTH_TEST);
```

The far side of the sphere is in front of the camera whether the camera is outside or inside, so the light always draws.

The footprint is still only a 2D outline, though. Turn on **Solo**, set **Volumes** to x-ray and **View** to **Useful vs wasted**. Thumbnail **5** splits light #1's footprint into three cases:

- **A:** the surface is in front of the sphere, closer to the camera. Not lit.
- **B:** the surface is inside the sphere. This is the only case that gets lit.
- **C:** the surface is behind the sphere, farther away. Not lit.

In mode 3, the shader runs for all three.

## Step 6: Mode 4, back faces with a depth test

The G-buffer's depth buffer can reject case C for free. Draw the back faces with the depth test reversed:

```js
gl.cullFace(gl.FRONT);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.GEQUAL);     // pass only if the sphere's far side is behind the scene surface
```

If the scene surface is farther away than the sphere's far side (case C), the test fails and the hardware discards the pixel before the shader runs.

So the Z test is not ignored when drawing light spheres. It is used, with the comparison flipped, and with depth writes turned off.

Case A still gets through: a surface in front of the whole sphere is also in front of its far side.

## Step 7: Mode 5, the stencil two-pass

Two passes per light remove case A as well.

**Pass 1** draws the whole sphere with color writes off and counts depth failures in the stencil buffer:

```js
gl.colorMask(false, false, false, false);
gl.disable(gl.CULL_FACE);
gl.depthFunc(gl.LESS);
gl.stencilOpSeparate(gl.BACK,  gl.KEEP, gl.INCR_WRAP, gl.KEEP);   // back face fails depth: +1
gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.DECR_WRAP, gl.KEEP);   // front face fails depth: -1
```

Work through the three cases:

| Case | Front face | Back face | Stencil |
|---|---|---|---|
| A: surface in front of the sphere | fails (−1) | fails (+1) | 0 |
| B: surface inside the sphere | passes | fails (+1) | 1 |
| C: surface behind the sphere | passes | passes | 0 |

**Pass 2** draws the sphere again with the lighting shader, only where the stencil is not zero:

```js
gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
```

Almost every remaining shader run is useful. The price is an extra draw and a stencil clear per light. Whether that pays off depends on the scene, so compare **GPU time, lighting pass** between modes 4 and 5.

## Step 8: Combine and tone-map (thumbnail 8)

The final pass adds a small constant ambient term and the light buffer, then compresses the result:

```glsl
vec3 c = albedo * 0.03 + light;
c = c / (1.0 + c);                 // Reinhard tone mapping
c = pow(c, vec3(1.0 / 2.2));       // to gamma space for the screen
```

Adding many lights can push values far above 1. That is correct: the light buffer holds physical amounts of light, not screen colors. Tone mapping squeezes the range back into what the screen can show, so bright areas roll off smoothly instead of clipping to white.

Ambient and directional lights reach every pixel, so they have no useful volume. They are done as one full-screen pass each. In this lab the ambient term is the single `albedo * 0.03` in the code above.

## Reading the numbers

- **Light shader runs:** how many times the lighting shader ran this frame, summed over all lights.
- **Equivalent full-screen passes:** runs divided by the pixel count. Mode 1 gives the light count.
- **Useful / wasted:** a run is useful if the surface was within the light's radius.
- **GPU time, lighting pass:** measured on your GPU, when the browser allows timer queries.

*Try it:* keep **Cost heatmap** on and step through modes 1 to 5. Then raise **Radius**: bigger lights overlap more, and every mode gets more expensive.

## The whole pipeline in short

**Once:** draw the scene into the G-buffer.

**For each light:** draw its sphere so the hardware rejects pixels the light cannot reach, run the lighting shader on the rest, and add the result to the light buffer.

**Once:** add ambient, tone-map, and show the image.
