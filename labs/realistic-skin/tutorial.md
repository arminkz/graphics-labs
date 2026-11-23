# Realistic skin: a walkthrough of the lab

The panel on the right is ordered as four layers, and this walkthrough follows the same order. The thumbnails under the head are numbered 1 to 8.

## The one idea

A head shaded with plain diffuse lighting and one highlight looks like painted plastic. Real skin differs from that in several separate ways, and each one is a layer you can add:

1. Light scatters under the surface before it comes back out.
2. An oily top layer reflects light in two overlapping highlights.
3. The surface has pores, and its color is uneven.
4. Parts of the head shadow each other, and thin parts let light through.

*Try it:* press **Mannequin (all layers off)**, then **Full skin**. Set **Split compare** to 50% to see both at once: mannequin on the left of the line, your settings on the right.

## How the lab draws the head

There is no triangle mesh. The head is a distance function, and every pixel finds the surface by marching a ray through it. The notes at the end of this page explain that in detail.

One thing matters for everything below: the shading pass writes diffuse light and specular light into separate buffers. Scattering only affects diffuse light, so the two have to stay apart until the end.

## Layer 1: Diffuse scattering (thumbnails 5 and 6)

Light that enters skin travels a short distance under the surface and leaves somewhere else. Red light travels farthest. The result is soft shading and red edges on shadows.

The **Diffuse** menu has three models:

- **Lambert:** no scattering. Light stops where it lands, so every pore and shadow edge is hard and gray.
- **Pre-integrated skin:** no blur pass. On a curved surface, scattering makes light wrap around the edge of the lit side, and how much depends on how tightly the surface curves. That result is computed once into a lookup table, indexed by N·L and curvature. Each pixel does one texture read. The table is drawn in the panel.
- **Screen-space separable SSS:** shade with Lambert first, then blur only the diffuse light in two 1D passes. The blur uses a measured skin profile with a different width per color channel, and the width is scaled by depth so that it stays a fixed number of millimeters on the face.

Thumbnail **3 (Curvature)** shows the value the lookup table uses: the nose and ears are tight curves, the forehead is nearly flat. Thumbnail **5** is the diffuse light as shaded, and **6** is the same light after scattering.

*Try it:* press **Nose shadow close-up** and switch between the three models. With Lambert the shadow edge is gray and sharp. With either scattering model it turns soft and red. Then move **Scatter width**.

## Layer 2: Specular, the oily layer (thumbnail 7)

The highlight comes from a thin film of oil and the rough outer skin under it. One lobe cannot match both, so skin shaders use two:

- a **sharp lobe** that gives the bright core, and
- a **broad lobe** that gives the wide soft sheen around it.

**Sharp lobe share** sets the mix between them, **Roughness** widens both, and **Oiliness** scales the whole layer.

Specular light is added after scattering and is never blurred. It reflects off the top surface and does not go under the skin, so it stays crisp even where the diffuse light is soft. That contrast is a large part of why skin looks wet instead of waxy.

*Try it:* turn **Dual-lobe specular** off. The highlight on the forehead and nose becomes a single hard blob.

## Layer 3: Surface detail (thumbnails 1 and 2)

- **Color variation:** blood near the surface, freckles, lips and brows change the albedo. Thumbnail **1** shows the skin color alone.
- **Pore depth:** small bumps in the normal. They break up the highlight, which is where pores are most visible. Thumbnail **2** shows the normals with pores.
- **Peach fuzz:** a soft brightening at grazing angles, from fine hairs catching the light.
- **Melanin** and **Blood flush:** shift the base color darker or redder.

*Try it:* raise **Melanin**. Darker skin shows scattering less and specular more, because less diffuse light comes back out.

## Layer 4: Light transport (thumbnail 4)

- **Self-shadowing:** the nose, brow and ears block the key light from other parts of the face.
- **Ambient occlusion:** creases such as the eye sockets and the sides of the nose receive less sky light.
- **Transmission:** where the head is thin, light entering from behind reaches the front. The shader marches from the surface point toward the light, through the inside of the head, and measures how much flesh is in the way. Little flesh means light gets through, tinted red.

Thumbnail **4** shows shadow times ambient occlusion. The **View** menu also has **Light getting through**, which shows the transmission term alone.

*Try it:* press **Back-lit ear**, then toggle **Transmission**. Change **Translucency** to control how thick a part can be and still glow.

## Lighting, camera and cost

- **Key azimuth** and **Key elevation** move the main light. **Cool rim light from behind** adds a second light that outlines the head.
- **Render scale** changes the resolution. Every pixel marches several rays, so this lab is heavy, and 50% helps on a slow GPU.
- The image only changes when you change a setting, so the lab renders once and then waits.

## The whole stack in short

**For each pixel:** find the surface, then compute skin color, a normal with pores, curvature, shadow, ambient occlusion and thickness.

**Diffuse light:** shade it, scatter it (lookup table or screen-space blur), and multiply by the skin color.

**Specular light:** two lobes, added on top without any blur.

**Thin parts:** add the light that came through.

---

# Notes: shadows and how the lab renders

## How self-shadowing works

**Self-shadowing means an object blocks light from reaching another part of itself**, like the nose shading the cheek. The test is the same as for any shadow: from the point you're shading, look toward the light and ask whether anything is in the way. There's no special case for "self"; the object is simply included as a possible blocker for its own surface.

### How this lab does it

The head isn't a triangle mesh. It's a **signed distance field (SDF)**: a function `map(p)` that returns the distance from any point `p` to the nearest surface. That makes the shadow test a short ray march:

```glsl
vec3 start = p + N * 0.015;          // step off the surface first
float t = 0.02, shadow = 1.0;
for (int i = 0; i < 28; i++) {
  float d = map(start + L * t);      // distance to the nearest surface from here
  if (d < 0.001) { shadow = 0.0; break; }   // touched something: fully in shadow
  shadow = min(shadow, 14.0 * d / t);       // near miss: partial shadow
  t += clamp(d, 0.015, 0.25);        // safe to advance by d: nothing is closer
}
```

1. **Start at the surface point and walk toward the light.** At each step, `map` tells you how far the nearest surface is, so you can safely jump that far.
2. **If the distance drops to zero, the ray hit the head** (the nose, the brow, the ear), so the point is in shadow.
3. **If the ray reaches open space,** the point is lit.

### Soft edges for free

The line `shadow = min(shadow, 14.0 * d / t)` gives a penumbra. A ray that *almost* grazes the nose has a small `d` at some point along the way. The ratio `d / t` is roughly the angle by which the ray missed, so a near miss gives partial shadow. The constant 14 sets the hardness: a higher value means a sharper edge, like a smaller light source.

This matters for skin, because the soft shadow edge is where scattering shows most. Light bleeds into the shadow and the edge turns red. Try **Nose shadow close-up** and switch between Lambert and the scattering models.

### The two details that prevent artifacts

- **The start offset** (`p + N * 0.015`). Without it, the ray starts at distance zero and immediately "hits" the surface it's standing on. That's the same problem as shadow acne, and the same kind of fix as the bias in shadow mapping.
- **Skipping points that face away from the light.** They're dark anyway from N·L, so the lab doesn't march for them.

### Compared with shadow mapping

| | Shadow map | SDF ray march (this lab) |
|---|---|---|
| Works with | any triangle mesh | only shapes with a distance function |
| Resolution | limited by texels, so blocky up close | exact at any zoom |
| Soft edges | need PCF or PCSS filtering | come from `d / t` |
| Cost | one extra render of the scene, then cheap lookups | up to 28 `map` calls per pixel |

Thumbnail **4 (Shadow+AO)** shows the shadow term alone, and the **Self-shadowing** checkbox turns it off.

## Is this lab ray-marched or rasterized?

Ray-marched, for the head's geometry. It's the only lab in this collection that works this way; the others rasterize triangle meshes.

**What's ray-marched:**

- **Visibility.** The GPU rasterizes just one full-screen quad. For each pixel, the fragment shader shoots a ray from the camera and marches it through the distance field until it hits the head.
- **Normals and curvature.** These come from sampling the distance field around the hit point.
- **Shadows, ambient occlusion and transmission thickness.** Each is a short extra march through the same field.

**What isn't:**

- **The skin shading.** Lambert, the pre-integrated lookup, dual-lobe GGX, pores and albedo are ordinary shading math. They'd be the same code in a rasterizer's fragment shader.
- **The screen-space SSS and the composite.** These are full-screen passes that only need the diffuse, specular and depth buffers.

So the structure is still "fill buffers, then post-process", like a deferred renderer. Only the step that fills the buffers changed.

**Why:** a believable head as a triangle mesh needs thousands of vertices, which would mean embedding a model file. An SDF head is about 20 lines of blended ellipsoids, and it gives exact curvature, soft shadows and real per-pixel thickness with very little code. The cost is that every pixel pays for around a hundred distance-field evaluations, which is why the lab renders only on change and has a render-scale control.

**How the pieces map to a real-time engine:**

| This lab (SDF) | Real-time engine (mesh) |
|---|---|
| Ray march to find the surface | Rasterize triangles |
| Normal from the field's gradient | Vertex normals + normal map |
| Pores from procedural noise | Detail normal map (often a tiled micro-normal) |
| Curvature from the field | Baked curvature texture, or screen-space derivatives |
| Shadow march | Shadow map + contact shadows |
| Thickness march | Baked thickness map, or shadow-map depth difference |
| Procedural color variation | Scanned albedo texture |

## If the head were a mesh: how shadows would be handled

Shadow maps would be the base, but a face needs more than one technique, because its self-shadowing happens at very different scales. A typical real-time setup stacks four layers.

### 1. A shadow map for the large shapes

The nose's shadow on the cheek, the brow over the eyes, the head on the neck. Render depth from the light, then compare per pixel.

The problem is resolution. A cascade that covers a whole scene gives the face only a few texels, so engines give hero characters a **per-object shadow map**: the light's frustum is fitted tightly around just the head or body. A 2048² map over a 30 cm head is about 0.15 mm per texel.

### 2. Contact shadows for the small shapes

The bias that prevents acne also erases shadows closer than about a millimeter to their caster: nostrils, eyelids, lip creases, where the ear meets the head.

The fix is a short **screen-space ray march**: from each pixel, step a few centimeters toward the light through the depth buffer, and if the ray goes behind something, darken the pixel. It's the SSR lab's march pointed at the light, with the same thickness guess and the same limit that it only sees what's on screen.

### 3. Ambient occlusion and cavity maps, baked

Pores, wrinkles and creases are too small for either method. Their occlusion is **baked into textures**: an AO map for ambient light, and often a cavity map that also dims specular inside pores. SSAO or GTAO adds the mid-scale part that changes with animation.

### 4. Soft, red shadow edges

- **Filtering:** PCF or PCSS, so the penumbra has some width.
- **Scattering:** with screen-space SSS the blur reddens the penumbra automatically, because the shadow is part of the diffuse light being blurred. With pre-integrated skin there's no blur, so Penner uses a second lookup table indexed by the shadow value and penumbra width to tint the edge.

### A bonus from the shadow map: transmission

The lab measures thickness by marching through the head. With a mesh, the shadow map provides it:

```glsl
float thickness = myDepthFromLight - shadowMapDepth;   // distance traveled inside
```

That's Jimenez's translucency method, and it's why back-lit ears work in games without an extra pass.

### What's changing

Engines with hardware ray tracing increasingly use **ray-traced shadows** for hero characters: no bias tuning, no resolution limit, and correct contact and penumbra in one technique. Unreal's virtual shadow maps are the rasterized answer to the same problem: very high resolution, allocated only where the screen needs it.
